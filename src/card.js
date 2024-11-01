/* global HTMLElement */
import { DateTime, Settings as LuxonSettings, Info as LuxonInfo } from 'luxon'
import styles from './card.styles.js'
import { CalendarEvent, Helpers } from './data.js'
import { Config } from './config.js'

function DEBUG () {
  // const consolePrefix = '[weekly-calendar-card]'
  // console.debug(consolePrefix, Array.prototype.join.call(arguments, ' '))
}

export class WeeklyCalendarCard extends HTMLElement {
  static styles = styles

  _hass
  _events = {}
  _jsonDays = ''

  constructor () {
    super()

    this._card = document.createElement('ha-card')
    this._card.innerHTML = `
      <ha-card>
        <div class="card-content">
          <ha-alert alert-type="error"></ha-alert>
          <h1 class="card-title"></h1>
          <div class="grid-container heading"></div>
          <div class="grid-container days"></div>
        </div>
      </ha-card>
    `

    this._errorContent = this._card.querySelector('ha-alert')
    this._titleContent = this._card.querySelector('.card-title')
    this._headingContent = this._card.querySelector('.heading')
    this._daysContent = this._card.querySelector('.days')

    this._style = document.createElement('style')
    this._style.textContent = styles

    this.attachShadow({ mode: 'open' })
    this.shadowRoot.append(this._style, this._card)

    this._periodicUpdate()
  }

  /**
   * Set configuration
   *
   * @param {Object} config
   */
  setConfig (config) {
    this._card_config = config

    this._config = new Config(config)
    DEBUG('Config Set')

    if (this._config.locale) {
      LuxonSettings.defaultLocale = this._config.locale
    }

    DEBUG(this._config.title)
    this._titleContent.style.display = this._config.title ? 'block' : 'none'
    this._titleContent.textContent = this._config.title

    const localizedWeekDays = LuxonInfo.weekdays(this._config.weekdayFormat)
    this._headingContent.innerHTML = this._config.weekdays.map((weekday) => {
      return `<div class="heading">${localizedWeekDays[weekday]}</div>`
    }).join('')
  }

  set error (error) {
    this._errorContent.style.display = error ? 'block' : 'none'
    this._errorContent.textContent = error
  }

  get error () {
    return this._errorContent.textContent
  }

  _renderHeading () {
    const localizedWeekDays = LuxonInfo.weekdays(this._config.weekdayFormat)
    return this._config.weekdays.map((weekday) => {
      return `<div class="heading">${localizedWeekDays[weekday]}</div>`
    }).join('')
  }

  _renderDays () {
    if (!this._days) {
      return ''
    }

    this._daysContent.innerHTML = this._days.map((day) => {
      return `
            <div class="day ${day.class}" data-date="${day.date.day}" data-weekday="${day.date.weekday}" data-month="${day.date.month}" data-year="${day.date.year}" data-week="${day.date.weekNumber}">
              <div class="date">
              <hr/>
              <span class="number">${this._config.formatDay(day.date)}</span>
              </div>

              <div class="events">
                ${day.events.length === 0
                  ? '<div class="none"></div>'
                  : day.events.map((event) => {
                      return `
                        <div class="event ${event.class}" data-entity="${event.calendar_entity}" style="${event.multiDay || event.fullDay ? `background: ${event.color}` : ''} ">
                          <div class="title"><span class="dot">${event.renderSummary(this._config)}</span></div>
                        </div>
                      `
                    }).join('')
                }
              </div>
            </div>
          `
    }).join('')
  }

  _periodicUpdate () {
    if (!this.hass || !this._config) {
      DEBUG('Waiting...', Boolean(this.hass), Boolean(this._config))
      setTimeout(() => this._periodicUpdate(), 50)
      return
    }

    DEBUG('Update')
    this._updateEvents()
    this._updateDays()

    DEBUG('Update Done')
    setTimeout(() => this._periodicUpdate(), this._config.updateInterval * 1000)
  }

  _updateEvents () {
    if (this._loadingEvents > 0) {
      return
    }

    DEBUG('Update Events')

    this.error = ''

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
          DEBUG('Update Calendar', calendar.entity)
          response.forEach(event => {
            this._safePush(this._events, CalendarEvent.Build(this._config, calendar, event))
          })
          this._loadingEvents--
        })
        .catch(error => {
          console.error(error)
          this.error = `Error while fetching calendar ${calendar.entity}: ${error.error}`
          this._loadingEvents = 0

          throw new Error(this.error)
        })
    })
  }

  _safePush (dict, events) {
    DEBUG('Add Events', events.length)
    events.forEach(event => {
      const dateKey = event.start.toISODate()
      DEBUG('  ', dateKey)
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

    DEBUG('Update Card')
    const days = []

    let yesterdayEvents = []
    this._config.days.forEach(currentDay => {
      let events = []
      const dateKey = currentDay.toISODate()
      if (dateKey in this._events) {
        events = this._events[dateKey].sort(CalendarEvent.compareTo)
      }

      DEBUG('  ', dateKey, events.length)

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
    const jsonDays = JSON.stringify(days)

    if (this._jsonDays !== jsonDays) {
      this._jsonDays = jsonDays
      DEBUG(this._jsonDays)
      this._renderDays()
    }
  }
}
