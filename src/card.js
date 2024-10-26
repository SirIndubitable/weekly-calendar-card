import { LitElement, html } from 'lit'
import { DateTime, Settings as LuxonSettings, Info as LuxonInfo } from 'luxon'
import styles from './card.styles.js'
import { CalendarEvent, Helpers } from './data.js'
import { Config } from './config.js'

export class WeeklyCalendarCard extends LitElement {
  static styles = styles

  _initialized = false
  _loading = 0
  _events = {}
  _jsonDays = ''

  /**
   * Get properties
   *
   * @return {Object}
   */
  static get properties () {
    return {
      _days: { type: Array },
      _config: { type: Object },
      _isLoading: { type: Boolean },
      _error: { type: String }
    }
  }

  /**
   * Set configuration
   *
   * @param {Object} config
   */
  setConfig (config) {
    this._card_config = config

    this._config = new Config(config)

    if (this._config.locale) {
      LuxonSettings.defaultLocale = this._config.locale
    }

    this._title = this._config.title
      ? html`<h1 class="card-title">${this._config.title}</h1>`
      : ''

    const localizedWeekDays = LuxonInfo.weekdays(this._config.weekdayFormat)
    this._heading = html`${this._config.weekdays.map((weekday) => {
            return `<div class="heading">${localizedWeekDays[weekday]}</div>`
        }).join('')}`
  }

  /**
   * Render
   *
   * @return {Object}
   */
  render () {
    if (!this._initialized) {
      this._initialized = true
      this._waitForHassAndConfig()
    }

    return html`
          <ha-card>
              <div class="card-content">
                  ${this._error
                      ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                      : ''
                  }
                  ${this._title}

                  <div class="grid-container heading">
                      ${this._heading}
                  </div>
                  <div class="grid-container">
                      ${this._renderDays()}
                  </div>
                  ${this._isLoading
                      ? html`<div class="loader"></div>`
                      : ''
                  }
              </div>
          </ha-card>
      `
  }

  _renderDays () {
    if (!this._days) {
      return html``
    }

    return html`
          ${this._days.map((day) => {
              return html`
                  <div class="day ${day.class}" data-date="${day.date.day}" data-weekday="${day.date.weekday}" data-month="${day.date.month}" data-year="${day.date.year}" data-week="${day.date.weekNumber}">
                      <div class="date">
                      <hr/>
                        <span class="number">${this._config.formatDay(day.date)}</span>
                      </div>

                      <div class="events">
                          ${day.events.length === 0
                              ? html`
                                  <div class="none"></div>
                              `
                              : html`
                                  ${day.events.map((event) => {
                                      return html`
                                          <div class="event ${event.class}" data-entity="${event.calendar_entity}" style="${event.multiDay || event.fullDay ? 'background' : '--border-color'}: ${event.color}" @click="${() => { this._handleEventClick(event) }}">
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
      `
  }

  _waitForHassAndConfig () {
    if (!this.hass || !this._config) {
      window.setTimeout(() => {
        this._waitForHassAndConfig()
      }, 50)
      return
    }

    this._updateEvents()
  }

  _updateEvents () {
    if (this._loading > 0) {
      return
    }

    this._loading++
    this._isLoading = true
    this._error = ''
    this._events = {}

    const startDate = this._config.startDate
    const endDate = this._config.endDate

    this._config.calendars.forEach(calendar => {
      this._loading++
      const request = 'calendars/' + calendar.entity + '?start=' + encodeURIComponent(startDate.toISO()) + '&end=' + encodeURIComponent(endDate.toISO())
      this.hass
        .callApi('get', request)
        .then(response => {
          response.forEach(event => {
            this._safePushEventData(CalendarEvent.Build(this._config, calendar, event))
          })
        })
        .catch(error => {
          console.error(error)
          this._error = `Error while fetching calendar ${calendar.entity}: ${error.error}`
          this._loading = 0

          throw new Error(this._error)
        })
      this._loading--
    })

    const checkLoading = window.setInterval(() => {
      if (this._loading === 0) {
        clearInterval(checkLoading)
        if (!this._error) {
          this._updateCard()
        }
        this._isLoading = false

        window.setTimeout(() => {
          this._updateEvents()
        }, this._config.updateInterval * 1000)
      }
    }, 50)

    this._loading--
  }

  _safePushEventData (events) {
    events.forEach(event => {
      const dateKey = event.start.toISODate()
      if (!(dateKey in this._events)) {
        this._events[dateKey] = []
      }

      this._events[dateKey].push(event)
    })
  }

  _getDayClass (startDate) {
    const classes = []
    const now = DateTime.now()
    if (Helpers.isSameDay(startDate, now)) {
      classes.push('today')
    } else if (Helpers.isSameDay(startDate, now.plus({ days: 1 }))) {
      classes.push('tomorrow')
      classes.push('future')
    } else if (Helpers.isSameDay(startDate, now.minus({ days: 1 }))) {
      classes.push('yesterday')
      classes.push('past')
    } else {
      if (startDate > now) {
        classes.push('future')
      } else {
        classes.push('past')
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
    ][startDate.weekday])
    return classes.join(' ')
  }

  _updateCard () {
    const days = []

    let yesterdayEvents = []
    this._config.days.forEach(currentDay => {
      let events = []

      const dateKey = currentDay.toISODate()
      if (dateKey in this._events) {
        events = this._events[dateKey].sort(CalendarEvent.compareTo)
      }

      // This loop reorders the multi-day events so that they are displayed in the
      // same location on the calendar as the previous day of the event.
      for (let todayIndex = 0; todayIndex < events.length; todayIndex++) {
        if (this._config.isStartOfWeek(currentDay)) {
          continue
        }

        if (!events[todayIndex].multiDay) {
          continue
        }

        const yesterdayIndex = yesterdayEvents.findIndex(event => event.summary === events[todayIndex].summary)
        if (yesterdayIndex < 0) {
          continue
        }

        if (yesterdayIndex === todayIndex) {
          continue
        }

        while (yesterdayIndex >= events.length) {
          events.push(CalendarEvent.null())
        }

        const temp = events[todayIndex]
        events[todayIndex] = events[yesterdayIndex]
        events[yesterdayIndex] = temp

        if (yesterdayIndex > todayIndex) {
          todayIndex--
        }
      }

      days.push({
        date: currentDay,
        events,
        class: this._getDayClass(currentDay)
      })

      yesterdayEvents = events
    })

    const jsonDays = JSON.stringify(days)
    if (jsonDays !== this._jsonDays) {
      this._days = days
      this._jsonDays = jsonDays
    }
  }
}
