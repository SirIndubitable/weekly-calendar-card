import { LitElement, html } from 'lit';
import { DateTime, Settings as LuxonSettings, Info as LuxonInfo } from "luxon"
import styles from './card.styles.js';
import { CalendarEvent, Helpers } from './data.js';

export class WeeklyCalendarCard extends LitElement {
  static styles = styles;

  _initialized = false;
  _loading = 0;
  _events = {};
  _jsonDays = '';
  _calendars;
  _updateInterval;
  _language;
  _startDate;

  /**
   * Get properties
   *
   * @return {Object}
   */
  static get properties() {
      return {
          _days: { type: Array },
          _config: { type: Object },
          _isLoading: { type: Boolean },
          _error: { type: String },
      }
  }

  /**
   * Set configuration
   *
   * @param {Object} config
   */
  setConfig(config) {
      this._card_config = config;

      if (!config.calendars) {
          throw new Error('No calendars are configured');
      }

      config.calendars.forEach((calendar) => {
        if (!calendar.entity) {
            throw new Error('Calendar must define an entity')
        }
      });

      this._weekdays = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      ]

      this._config = {};
      this._config.startOfWeek = this._weekdays.indexOf(config.startOfWeek ?? "sunday") + 1;
      this._config.filter = config.filter ?? false;
      this._config.dayFormat = config.dayFormat ?? "d";
      this._config.timeFormat = config.timeFormat ?? 'HH:mm';

      this._title = config.title ?? null;
      this._calendars = config.calendars;
      this._numberOfWeeks = config.weeks ?? 4;
      this._updateInterval = config.updateInterval ?? 60;
      this._hidePastEvents = config.hidePastEvents ?? false;

      if (config.locale) {
          LuxonSettings.defaultLocale = config.locale;
      }

      this._startDate = this._getStartDate();
      this._language = Object.assign(
          {},
          {
              fullDay: 'Entire day',
              today: 'Today',
              tomorrow: 'Tomorrow',
              yesterday: 'Yesterday',
              sunday: LuxonInfo.weekdays('short')[6],
              monday: LuxonInfo.weekdays('short')[0],
              tuesday: LuxonInfo.weekdays('short')[1],
              wednesday: LuxonInfo.weekdays('short')[2],
              thursday: LuxonInfo.weekdays('short')[3],
              friday: LuxonInfo.weekdays('short')[4],
              saturday: LuxonInfo.weekdays('short')[5]
          },
          config.texts ?? {}
      );
  }

  /**
   * Render
   *
   * @return {Object}
   */
  render() {
      if (!this._initialized) {
          this._initialized = true;
          this._waitForHassAndConfig();
      }

      let cardClasses = [];
      if (this._compact) {
          cardClasses.push('compact');
      }

      return html`
          <ha-card class="${cardClasses.join(' ')}">
              <div class="card-content">
                  ${this._error ?
                      html`<ha-alert alert-type="error">${this._error}</ha-alert>` :
                      ''
                  }
                  ${this._title ?
                      html`<h1 class="card-title">${this._title}</h1>` :
                      ''
                  }

                  <div class="grid-container heading">
                      ${this._renderHeading()}
                  </div>
                  <div class="grid-container">
                      ${this._renderDays()}
                  </div>
                  ${this._isLoading ?
                      html`<div class="loader"></div>` :
                      ''
                  }
              </div>
          </ha-card>
      `;
  }

  _renderHeading() {

    const weekDays = [
        this._language.sunday,
        this._language.monday,
        this._language.tuesday,
        this._language.wednesday,
        this._language.thursday,
        this._language.friday,
        this._language.saturday,
    ];

    return html`
    <div class="heading">${weekDays[this._config.startOfWeek % 7]}</div>
    <div class="heading">${weekDays[(this._config.startOfWeek + 1) % 7]}</div>
    <div class="heading">${weekDays[(this._config.startOfWeek + 2) % 7]}</div>
    <div class="heading">${weekDays[(this._config.startOfWeek + 3) % 7]}</div>
    <div class="heading">${weekDays[(this._config.startOfWeek + 4) % 7]}</div>
    <div class="heading">${weekDays[(this._config.startOfWeek + 5) % 7]}</div>
    <div class="heading">${weekDays[(this._config.startOfWeek + 6) % 7]}</div>
    `;
}

  _renderDays() {
      if (!this._days) {
          return html``;
      }

      return html`
          ${this._days.map((day) => {
              return html`
                  <div class="day ${day.class}" data-date="${day.date.day}" data-weekday="${day.date.weekday}" data-month="${day.date.month}" data-year="${day.date.year}" data-week="${day.date.weekNumber}">
                      <div class="date">
                      <hr/>
                        <span class="number">${day.date.toFormat(this._config.dayFormat)}</span>
                      </div>

                      <div class="events">
                          ${day.events.length === 0 ?
                              html`
                                  <div class="none"></div>
                              ` :
                              html`
                                  ${day.events.map((event) => {
                                      return html`
                                          <div class="event ${event.class}" data-entity="${event.calendar_entity}" style="${event.multiDay || event.fullDay ? "background" :  "--border-color"}: ${event.color}" @click="${() => { this._handleEventClick(event) }}">
                                            <div class="title">${event.renderSummary(this._config)}</div>
                                          </div>
                                      `
                                  })}
                              `
                          }
                      </div>
                  </div>
              `
          })}
      `;
  }

  _waitForHassAndConfig() {
      if (!this.hass || !this._calendars) {
          window.setTimeout(() => {
              this._waitForHassAndConfig();
          }, 50)
          return;
      }

      this._updateEvents();
  }

  _updateEvents() {
      if (this._loading > 0) {
          return;
      }

      this._loading++;
      this._isLoading = true;
      this._error = '';
      this._events = {};

      this._startDate = this._getStartDate();
      let startDate = this._startDate;
      let endDate = this._startDate.plus({ days: 7 * this._numberOfWeeks });

      this._calendars.forEach(calendar => {
          this._loading++;
          let request = 'calendars/' + calendar.entity + '?start=' + encodeURIComponent(startDate.toISO()) + '&end=' + encodeURIComponent(endDate.toISO());
          this.hass.callApi(
              'get',
              request
          ).then(response => {
              response.forEach(event => {
                  this._safePushEventData(
                    CalendarEvent.Build(this._config, calendar, event))
              });

              this._loading--;
          }).catch(error => {
              console.error(error);
              this._error = 'Error while fetching calendar: ' + error.error;
              this._loading = 0;
              throw new Error(this._error);
          });
      });

      let checkLoading = window.setInterval(() => {
          if (this._loading === 0) {
              clearInterval(checkLoading);
              if (!this._error) {
                  this._updateCard();
              }
              this._isLoading = false;

              window.setTimeout(() => {
                  this._updateEvents();
              }, this._updateInterval * 1000);
          }
      }, 50);

      this._loading--;
  }

  _safePushEventData(events)
  {
    events.forEach(event => {
        const dateKey = event.start.toISODate();
        if (!(dateKey in this._events)) {
            this._events[dateKey] = [];
        }

        this._events[dateKey].push(event);
    })
  }

  _getDayClass(startDate) {
      let classes = [];
      let now = DateTime.now();
      if (Helpers.isSameDay(startDate, now)) {
          classes.push('today');
      } else if (Helpers.isSameDay(startDate, now.plus({ days: 1 }))) {
          classes.push('tomorrow');
          classes.push('future');
      } else if (Helpers.isSameDay(startDate, now.minus({ days: 1 }))) {
          classes.push('yesterday');
          classes.push('past');
      } else {
          if (startDate > now) {
              classes.push('future');
          } else {
              classes.push('past');
          }
      }
      classes.push([
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday'
      ][startDate.weekday]);
      return classes.join(' ');
  }

  _updateCard() {
      let days = [];

      let startDate = this._startDate;
      let endDate = this._startDate.plus({ days: 7 * this._numberOfWeeks });

      let yesterdayEvents = []
      while (startDate < endDate) {
          let events = [];

          const dateKey = startDate.toISODate();
          if (dateKey in this._events) {
              events = this._events[dateKey].sort(CalendarEvent.compareTo);
          }

          // This loop reorders the multi-day events so that they are displayed in the
          // same location on the calendar as the previous day of the event.
          for (let todayIndex = 0; todayIndex < events.length; todayIndex++) {
            if (startDate.weekday == this._config.startOfWeek) {
                continue;
            }

            if (!events[todayIndex].multiDay) {
                continue;
            }

            let yesterdayIndex = yesterdayEvents.findIndex(event => event.summary == events[todayIndex].summary);
            if (yesterdayIndex < 0) {
                continue;
            }

            if (yesterdayIndex == todayIndex) {
                continue;
            }

            while (yesterdayIndex >= events.length)
            {
                events.push(CalendarEvent.null());
            }

            let temp = events[todayIndex];
            events[todayIndex] = events[yesterdayIndex];
            events[yesterdayIndex] = temp;

            if (yesterdayIndex > todayIndex) {
                todayIndex--;
            }
          }

          days.push({
              date: startDate,
              events: events,
              class: this._getDayClass(startDate)
          });

          yesterdayEvents = events;
          startDate = startDate.plus({ days: 1 });
      }

      const jsonDays = JSON.stringify(days)
      if (jsonDays !== this._jsonDays) {
          this._days = days;
          this._jsonDays = jsonDays;
      }
  }

  _getStartDate() {
    let startDate = DateTime.now().startOf('day');
    const dayOffset = Helpers.mod(startDate.weekday - this._config.startOfWeek, 7);

    startDate = startDate.minus({ days: dayOffset })

    return startDate;
  }
}
