import { DateTime } from 'luxon'
import { Helpers } from './data.js'

function validateConfig (typeName, config, name, defaultValue) {
  if (defaultValue === undefined && !(name in config)) {
    throw new Error(`${name} is required`)
  }

  if (!(name in config)) {
    return defaultValue
  }

  const configType = typeof config[name]
  if (typeName !== configType) {
    throw new Error(`${name} must be a ${typeName}, but is a ${configType}`)
  }

  return config[name]
}

function validateNumber (config, name, defaultValue) {
  return validateConfig('number', config, name, defaultValue)
}

function validateString (config, name, defaultValue) {
  return validateConfig('string', config, name, defaultValue)
}

function validateBoolean (config, name, defaultValue) {
  return validateConfig('boolean', config, name, defaultValue)
}

export class Config {
  static _weekdays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ]

  constructor (config) {
    this.calendars = config.calendars.map(calendar => new CalendarConfig(calendar))

    const startOfWeekname = validateString(config, 'startOfWeek', 'sunday')
    if (!Config._weekdays.includes(startOfWeekname)) {
      throw new Error(`startOfWeek ${startOfWeekname} was not one of [${Config._weekdays.join(', ')}]`)
    }

    this._startOfWeek = Config._weekdays.indexOf(startOfWeekname) + 1
    this._filter = validateString(config, 'filter', null)
    this._longWeekdayFormat = validateBoolean(config, 'longWeekdays', false)
    this._dayFormat = validateString(config, 'dayFormat', 'd')
    this._timeFormat = validateString(config, 'timeFormat', 'HH:mm')

    this._numberOfWeeks = validateNumber(config, 'weeks', 4)

    this.locale = validateString(config, 'locale', null)
    this.title = validateString(config, 'title', null)
    this.updateInterval = validateNumber(config, 'updateInterval', 60)
    this.hidePastEvents = validateBoolean(config, 'hidePastEvents', false)
  }

  shouldFilterOut (summary) {
    if (this._filter == null) {
      return false
    }

    return new RegExp(this._filter).test(summary)
  }

  get weekdayFormat () {
    return this.longWeekdays ? 'long' : 'short'
  }

  get days () {
    const result = []
    let currentDate = this.startDate
    for (let i = 0; i < this._numberOfWeeks * 7; i++) {
      result.push(currentDate)
      currentDate = currentDate.plus({ days: 1 })
    }

    return result
  }

  get weekdays () {
    // These weekdays are 0 index, not 1 indexed for some reason
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push((this._startOfWeek + i - 1) % 7)
    }

    return days
  }

  get startDate () {
    let date = DateTime.now().startOf('day')
    const dayOffset = Helpers.mod(date.weekday - this._startOfWeek, 7)

    date = date.minus({ days: dayOffset })

    return date
  }

  get endDate () {
    return this.startDate.plus({ days: this._numberOfWeeks * 7 })
  }

  isStartOfWeek (datetime) {
    return datetime.weekday === this._startOfWeek
  }

  formatDay (datetime) {
    return datetime.toFormat(this._dayFormat)
  }

  formatTime (datetime) {
    return datetime.toFormat(this._timeFormat).replace('AM', 'am').replace('PM', 'pm')
  }
}

export class CalendarConfig {
  constructor (config) {
    this.entity = validateString(config, 'entity')
    this.color = validateString(config, 'color', 'inherit')
    this.sorting = validateNumber(config, 'sorting', 100)
    this._filter = validateString(config, 'filter', null)

    if (!('prefix' in config)) {
      this.prefix = null
    } else {
      const prefixType = typeof config.prefix
      if (prefixType !== 'string' && prefixType !== 'object') {
        throw new Error(`${this.entity} prefix must be a string, or dictionary of strings`)
      }

      this.prefix = config.prefix
    }
  }

  shouldFilterOut (summary) {
    if (this._filter == null) {
      return false
    }

    return new RegExp(this._filter).test(summary)
  }
}
