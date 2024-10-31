import { LitElement, html } from 'lit'
import { DateTime, Settings as LuxonSettings, Info as LuxonInfo } from 'luxon'
import styles from './card.styles.js'
import { CalendarEvent, Helpers } from './data.js'
import { Config } from './config.js'

// const DEBUG = true
const consolePrefix = '[weekly-calendar-card]'

export class WeeklyCalendarCard extends LitElement {
  static styles = styles

  _hass
  _events = {}
  _jsonDays = ''

  /**
   * Get properties
   *
   * @return {Object}
   */
  static get properties () {
    return {
      _jsonDays: { type: Array },
      _config: { type: Object },
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
    console.debug(consolePrefix, 'Config Set')

    if (this._config.locale) {
      LuxonSettings.defaultLocale = this._config.locale
    }
  }

  connectedCallback () {
    console.debug(consolePrefix, 'connectedCallback')
    super.connectedCallback()
    this._timerInterval = setInterval(() => this._waitForHassAndConfig(), 50)
  }

  _waitForHassAndConfig () {
    if (!this.hass || !this._config) {
      console.debug(consolePrefix, 'Waiting...', Boolean(this.hass), Boolean(this._config))
      return
    }

    clearInterval(this._timerInterval)
    this._timerInterval = setInterval(() => this._periodicUpdate(), this._config.updateInterval * 1000)
    this._periodicUpdate()
  }

  disconnectedCallback () {
    console.debug(consolePrefix, 'disconnectedCallback')
    super.disconnectedCallback()
    clearInterval(this._timerInterval)
  }

  /**
   * Render
   *
   * @return {Object}
   */
  render () {
    if (!this._config) {
      return html``
    }

    console.debug(consolePrefix, 'Render')
    return html`
          <ha-card>
              <div class="card-content">
                  ${this._renderError()}
                  ${this._renderTitle()}

                  <div class="grid-container heading">
                    ${this._renderHeading()}
                  </div>
                  <div class="grid-container">
                      ${this._renderDays()}
                  </div>
              </div>
          </ha-card>
      `
  }

  _renderTitle () {
    return this._config.title
      ? html`<h1 class="card-title">${this._config.title}</h1>`
      : ''
  }

  _renderError () {
    return this._error
      ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
      : ''
  }

  _renderHeading () {
    const localizedWeekDays = LuxonInfo.weekdays(this._config.weekdayFormat)
    // this._heading = this._config.weekdays.map((weekday) => {
    //   return localizedWeekDays[weekday]
    // })

    return html`
        ${this._config.weekdays.map((weekday) => {
            return html`<div class="heading">${localizedWeekDays[weekday]}</div>`
        })}
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

  _periodicUpdate () {
    console.debug(consolePrefix, 'Update')
    if (!this.hass || !this._config) {
      return
    }

    this._updateEvents()
    this._updateDays()

    console.debug(consolePrefix, 'Update Done')
  }

  _updateEvents () {
    if (this._loadingEvents > 0) {
      return
    }

    console.debug(consolePrefix, 'Update Events')

    this._error = ''

    const startDate = this._config.startDate
    const endDate = this._config.endDate

    this._events = {}
    this._loadingEvents = this._config.calendars.length
    this._config.calendars.forEach(calendar => {
      const request = 'calendars/' + calendar.entity + '?start=' + encodeURIComponent(startDate.toISO()) + '&end=' + encodeURIComponent(endDate.toISO())
      this.hass
        .callApi('get', request)
        .then(response => {
          if (this._loadingEvents === 0) {
            // Something errored, just bail
            return
          }
          console.debug(consolePrefix, 'Update Calendar', calendar.entity)
          response.forEach(event => {
            this._safePush(this._events, CalendarEvent.Build(this._config, calendar, event))
          })
          this._loadingEvents--
        })
        .catch(error => {
          console.error(error)
          this._error = `Error while fetching calendar ${calendar.entity}: ${error.error}`
          this._loadingEvents = 0

          throw new Error(this._error)
        })
    })
  }

  _safePush (dict, events) {
    console.debug(consolePrefix, 'Add Events', events.length)
    events.forEach(event => {
      const dateKey = event.start.toISODate()
      console.debug(consolePrefix, '  ', dateKey)
      if (!(dateKey in dict)) {
        dict[dateKey] = []
      }

      dict[dateKey].push(event)
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

  _updateDays () {
    if (this.error) {
      return
    }
    if (this._loadingEvents > 0) {
      setTimeout(() => this._updateDays(), 50)
      return
    }

    console.debug(consolePrefix, 'Update Card')
    const days = []

    let yesterdayEvents = []
    this._config.days.forEach(currentDay => {
      let events = []
      const dateKey = currentDay.toISODate()
      if (dateKey in this._events) {
        events = this._events[dateKey].sort(CalendarEvent.compareTo)
      }

      console.debug(consolePrefix, '  ', dateKey, events.length)

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

    this._days = days
    this._jsonDays = JSON.stringify(days)
    console.debug(consolePrefix, this._jsonDays)
  }
}
