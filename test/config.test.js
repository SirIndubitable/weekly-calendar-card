/* global test, expect, jest */
/* eslint no-new: 0 */
import { DateTime } from 'luxon'
import { Config, CalendarConfig } from '../src/config.js'

test('CalendarConfig constructor', () => {
  const configData = {
    calendars: []
  }

  expect(new Config(configData))

  configData.startOfWeek = 2
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.startOfWeek = 'bar'
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.startOfWeek = 'sunday'
  expect(new Config(configData))

  configData.filter = true
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.filter = 'foo'
  expect(new Config(configData))

  configData.longWeekdays = 'twelve'
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.longWeekdays = true
  expect(new Config(configData))

  configData.dayFormat = true
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.dayFormat = 'dd'
  expect(new Config(configData))

  configData.timeFormat = 27
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.timeFormat = 'mm'
  expect(new Config(configData))

  configData.weeks = 'yes'
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.weeks = 2
  expect(new Config(configData))

  configData.locale = 100
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.locale = 'en'
  expect(new Config(configData))

  configData.title = {}
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.title = 'CALENDAR'
  expect(new Config(configData))

  configData.updateInterval = 'always'
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.updateInterval = 20
  expect(new Config(configData))

  configData.hidePastEvents = 'always'
  expect(() => { new Config(configData) }).toThrow(Error)

  configData.hidePastEvents = true
  expect(new Config(configData))
})

test('Config.shouldFilterOut', () => {
  let config = new Config({
    filter: 'foo',
    calendars: []
  })

  expect(config.shouldFilterOut('The best food event')).toBe(true)
  expect(config.shouldFilterOut('Go to a bar')).toBe(false)

  config = new Config({
    calendars: []
  })
  expect(config.shouldFilterOut('The best food event')).toBe(false)
})

test('Config.startDate', () => {
  const config = new Config({
    startOfWeek: 'tuesday',
    calendars: []
  })

  Date.now = jest.fn(() => new Date(Date.UTC(2025, 0, 17, 15, 35)).valueOf())
  expect(config.startDate.toISO()).toBe(DateTime.local(2025, 1, 14).toISO())

  Date.now = jest.fn(() => new Date(Date.UTC(2025, 0, 13, 15, 35)).valueOf())
  expect(config.startDate.toISO()).toBe(DateTime.local(2025, 1, 7).toISO())

  Date.now = jest.fn(() => new Date(Date.UTC(2025, 0, 14, 15, 35)).valueOf())
  expect(config.startDate.toISO()).toBe(DateTime.local(2025, 1, 14).toISO())
})

test('Config.days', () => {
  Date.now = jest.fn(() => new Date(Date.UTC(2025, 0, 17, 15, 35)).valueOf())
  const config = new Config({
    startOfWeek: 'tuesday',
    weeks: 2,
    calendars: []
  })

  expect(config.days.length).toBe(14)
  expect(config.days[0].toISO()).toBe(DateTime.local(2025, 1, 14).toISO())
  expect(config.days[config.days.length - 1].toISO()).toBe(DateTime.local(2025, 1, 27).toISO())

  expect(config.endDate.toISO()).toBe(DateTime.local(2025, 1, 28).toISO())
})

test('Config.weekdays', () => {
  const config = new Config({
    startOfWeek: 'thursday',
    calendars: []
  })

  expect(config.weekdays).toStrictEqual([4, 5, 6, 0, 1, 2, 3])
})

test('Config.formatDay', () => {
  const config = new Config({
    dayFormat: 'MM/dd',
    calendars: []
  })

  expect(config.formatDay(DateTime.local(2025, 1, 3))).toBe('01/03')
  expect(config.formatDay(DateTime.local(2025, 1, 20))).toBe('01/20')
})

test('Config.formatTime', () => {
  const config = new Config({
    timeFormat: 'hha',
    calendars: []
  })

  expect(config.formatTime(DateTime.local(2025, 1, 3, 8, 30))).toBe('08am')
  expect(config.formatTime(DateTime.local(2025, 1, 3, 14))).toBe('02pm')
})

test('CalendarConfig.shouldFilterOut', () => {
  let config = new CalendarConfig({
    filter: 'foo',
    entity: 'bar'
  })

  expect(config.shouldFilterOut('The best food event')).toBe(true)
  expect(config.shouldFilterOut('Go to a bar')).toBe(false)

  config = new CalendarConfig({
    entity: 'bar'
  })
  expect(config.shouldFilterOut('The best food event')).toBe(false)
})

test('CalendarConfig constructor', () => {
  const configData = {}

  expect(() => { new CalendarConfig(configData) }).toThrow()

  configData.entity = 'bar'
  expect(new CalendarConfig(configData))

  configData.color = true
  expect(() => { new CalendarConfig(configData) }).toThrow()

  configData.color = 'red'
  expect(new CalendarConfig(configData))

  configData.sorting = 'foo'
  expect(() => { new CalendarConfig(configData) }).toThrow()

  configData.sorting = 100
  expect(new CalendarConfig(configData))

  configData.filter = true
  expect(() => { new CalendarConfig(configData) }).toThrow()

  configData.filter = 'foo'
  expect(new CalendarConfig(configData))

  configData.prefix = 100
  expect(() => { new CalendarConfig(configData) }).toThrow()

  configData.prefix = 'foo'
  expect(new CalendarConfig(configData))

  configData.prefix = { en: 'foo' }
  expect(new CalendarConfig(configData))
})
