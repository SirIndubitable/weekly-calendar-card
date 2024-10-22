/* global test, expect */
import { DateTime } from 'luxon'
import { CalendarEvent, Helpers } from '../src/data.js'

test('mod', () => {
  expect(Helpers.mod(14, 7)).toBe(0)
  expect(Helpers.mod(4, 7)).toBe(4)
  expect(Helpers.mod(-4, 7)).toBe(3)
})

test('isSameDay', () => {
  const date1 = DateTime.local(2021, 1, 1, 12, 0, 0)
  const date2 = DateTime.local(2021, 1, 1, 18, 0, 0)
  const date3 = DateTime.local(2021, 1, 2, 12, 0, 0)
  const date4 = DateTime.local(2022, 1, 1, 12, 0, 0)

  expect(Helpers.isSameDay(date1, date2)).toBe(true)
  expect(Helpers.isSameDay(date1, date3)).toBe(false)
  expect(Helpers.isSameDay(date1, date4)).toBe(false)
})

test('isFullDay', () => {
  const startDate = DateTime.local(2021, 1, 1, 0, 0, 0)
  const endDate1 = DateTime.local(2021, 1, 2, 0, 0, 0)
  const endDate2 = DateTime.local(2021, 1, 1, 23, 59, 59)
  const multiEndDate = DateTime.local(2021, 1, 5, 0, 0, 0)

  expect(Helpers.isFullDay(startDate, endDate1, false)).toBe(true)
  expect(Helpers.isFullDay(startDate, endDate2, false)).toBe(false)
  expect(Helpers.isFullDay(startDate, multiEndDate, false)).toBe(false)
  expect(Helpers.isFullDay(startDate, multiEndDate, true)).toBe(true)
})

test('CalendarEvent._getPrefix', () => {
  const summary = 'Test Event'
  expect(CalendarEvent._getPrefix(summary, null)).toBe(null)
  expect(CalendarEvent._getPrefix(summary, 'foo')).toBe('foo')
  expect(CalendarEvent._getPrefix(summary, { 'st E': 'bar' })).toBe('bar')
  expect(CalendarEvent._getPrefix(summary, { REAL: 'bar' })).toBe(null)
  expect(CalendarEvent._getPrefix(summary, { default: 'baz', REAL: 'bar' })).toBe('baz')
})

test('CalendarEvent._getEventClass', () => {
  // Full Day
  let start = DateTime.now().plus({ days: 10 }).startOf('day')
  let end = start.plus({ days: 1 })
  expect(CalendarEvent._getEventClass(false, true, start, end, start, end))
    .toBe('fullday future')

  // Past event
  start = DateTime.now().minus({ days: 10 })
  end = start.plus({ hours: 1 })
  expect(CalendarEvent._getEventClass(false, false, start, end, start, end))
    .toBe('past')

  // Current event
  start = DateTime.now().minus({ hour: 1 })
  end = DateTime.now().plus({ hour: 1 })
  expect(CalendarEvent._getEventClass(false, false, start, end, start, end))
    .toBe('ongoing')

  const originalStart = DateTime.now().minus({ days: 2 })
  const originalEnd = DateTime.now().plus({ days: 5 })
  // Multiday Start event
  start = originalStart
  end = start.plus({ days: 1 }).startOf('day')
  expect(CalendarEvent._getEventClass(true, false, start, end, originalStart, originalEnd))
    .toBe('multiday start past')

  // Multiday Middle event
  start = DateTime.now().plus({ days: 1 }).startOf('day')
  end = start.plus({ days: 1 })
  expect(CalendarEvent._getEventClass(true, false, start, end, originalStart, originalEnd))
    .toBe('multiday future')

  // Multiday End event
  start = originalEnd.startOf('day')
  end = originalEnd
  expect(CalendarEvent._getEventClass(true, false, start, end, originalStart, originalEnd))
    .toBe('multiday end future')
})

const config = {
  timeFormat: 'h:mma'
}
const calendar = {
  prefix: 'foo'
}
function CreateEvent (originalStart, originalEnd, eventStart, eventEnd) {
  const eventData = {
    summary: 'Test Event',
    start: { dateTime: originalStart.toISO() },
    end: { dateTime: originalEnd.toISO() }
  }

  if (eventStart === undefined ||
    eventEnd === undefined) {
    eventStart = originalStart
    eventEnd = originalEnd
  }

  return new CalendarEvent(eventData, eventStart, eventEnd, calendar)
}

test('CalendarEvent.renderSummary(event)', () => {
  const start = DateTime.local(2024, 10, 1, 11, 47)
  const event = CreateEvent(start, start.plus({ hours: 1 }))

  expect(event.renderSummary(config)).toBe('11:47am foo Test Event')
})

test('CalendarEvent.renderSummary(fullDayEvent)', () => {
  const event = CreateEvent(
    DateTime.local(2024, 10, 1),
    DateTime.local(2024, 10, 2))

  expect(event.renderSummary(config)).toBe('foo Test Event')
})

test('CalendarEvent.renderSummary(multiDayEvent)', () => {
  let originalStart = DateTime.local(2024, 10, 1, 15, 30)
  let originalEnd = DateTime.local(2024, 10, 5, 16, 0)

  // Multiday Start event
  let event = CreateEvent(
    originalStart,
    originalEnd,
    originalStart,
    originalStart.startOf('day').plus({ days: '1' }))

  expect(event.renderSummary(config)).toBe('3:30pm foo Test Event')

  // Multiday End event
  event = CreateEvent(
    originalStart,
    originalEnd,
    originalEnd.startOf('day'),
    originalEnd)

  expect(event.renderSummary(config)).toBe('4:00pm')
  expect(event.renderSummary({ timeFormat: 'h:mma', startOfWeek: event.start.weekday }))
    .toBe('foo Test Event 4:00pm')

  // Multiday Start event, full day
  originalStart = DateTime.local(2024, 10, 1)
  originalEnd = DateTime.local(2024, 10, 5)
  event = CreateEvent(
    originalStart,
    originalEnd,
    originalStart,
    originalStart.plus({ days: '1' }))

  expect(event.renderSummary(config)).toBe('foo Test Event')

  // Multiday End event, full day
  event = CreateEvent(
    originalStart,
    originalEnd,
    originalEnd.minus({ days: 1 }),
    originalEnd)

  expect(event.renderSummary(config)).toBe('\xa0')
  expect(event.renderSummary({ timeFormat: 'h:mma', startOfWeek: event.start.weekday }))
    .toBe('foo Test Event')

  // Multiday middle event
  originalStart = DateTime.local(2024, 10, 1, 15, 30)
  originalEnd = DateTime.local(2024, 10, 5, 16, 0)
  const eventStart = originalStart.plus({ days: 2 }).startOf('day')
  event = CreateEvent(
    originalStart,
    originalEnd,
    eventStart,
    eventStart.plus({ days: '1' }))

  expect(event.renderSummary(config))
    .toBe('\xa0')
  expect(event.renderSummary({ timeFormat: 'h:mma', startOfWeek: event.start.weekday }))
    .toBe('foo Test Event')
})

test('CalendarEvent.Build(MultiDayEvent)', () => {
  const start = DateTime.local(2024, 10, 1, 15, 30)
  const end = DateTime.local(2024, 10, 3, 16, 0)
  const eventData = {
    summary: 'Test Event',
    start: { dateTime: start.toISO() },
    end: { dateTime: end.toISO() }
  }

  const events = CalendarEvent.Build(config, calendar, eventData)

  expect(events.length).toBe(3)
  expect(events[0].start).toEqual(start)
  expect(events[0].end).toEqual(start.plus({ days: 1 }).startOf('day'))
  expect(events[1].start).toEqual(start.plus({ days: 1 }).startOf('day'))
  expect(events[1].end).toEqual(start.plus({ days: 2 }).startOf('day'))
  expect(events[2].start).toEqual(start.plus({ days: 2 }).startOf('day'))
  expect(events[2].end).toEqual(end)
  events.forEach(event => {
    expect(event.summary).toBe('Test Event')
    expect(event.fullDay).toBe(false)
    expect(event.multiDay).toBe(true)
  })
})

test('CalendarEvent.Build(FullDayEvent)', () => {
  const start = DateTime.local(2024, 10, 1)
  const end = DateTime.local(2024, 10, 2)
  const eventData = {
    summary: 'Test Event',
    start: { dateTime: start.toISO() },
    end: { dateTime: end.toISO() }
  }

  const events = CalendarEvent.Build(config, calendar, eventData)

  expect(events.length).toBe(1)
  expect(events[0].start).toEqual(start)
  expect(events[0].end).toEqual(end)
  expect(events[0].summary).toBe('Test Event')
  expect(events[0].fullDay).toBe(true)
  expect(events[0].multiDay).toBe(false)
})

test('CalendarEvent.Build(SimpleEvent)', () => {
  const start = DateTime.local(2024, 10, 1, 9, 45)
  const end = DateTime.local(2024, 10, 1, 10, 0)
  const eventData = {
    summary: 'Test Event',
    start: { dateTime: start.toISO() },
    end: { dateTime: end.toISO() }
  }

  const events = CalendarEvent.Build(config, calendar, eventData)

  expect(events.length).toBe(1)
  expect(events[0].start).toEqual(start)
  expect(events[0].end).toEqual(end)
  expect(events[0].summary).toBe('Test Event')
  expect(events[0].fullDay).toBe(false)
  expect(events[0].multiDay).toBe(false)
})

test('CalendarEvent.Build(FilteredEvent)', () => {
  const start = DateTime.local(2024, 10, 1, 9, 45)
  const end = DateTime.local(2024, 10, 1, 10, 0)
  const eventData = {
    summary: 'Test Event',
    start: { dateTime: start.toISO() },
    end: { dateTime: end.toISO() }
  }

  let events = CalendarEvent.Build({ filter: 'est' }, calendar, eventData)
  expect(events.length).toBe(0)

  events = CalendarEvent.Build(config, { filter: 'est' }, eventData)
  expect(events.length).toBe(0)
})

test('CalendarEvent.Build(HidePastEvent)', () => {
  let start = DateTime.now().plus({ days: 1 })
  let end = start.plus({ hours: 1 })
  let eventData = {
    summary: 'Test Event',
    start: { dateTime: start.toISO() },
    end: { dateTime: end.toISO() }
  }

  let events = CalendarEvent.Build({ hidePastEvents: true }, calendar, eventData)
  expect(events.length).toBe(1)

  start = DateTime.now().minus({ hours: 1 })
  end = DateTime.now().plus({ hours: 1 })
  eventData = {
    summary: 'Test Event',
    start: { dateTime: start.toISO() },
    end: { dateTime: end.toISO() }
  }

  events = CalendarEvent.Build({ hidePastEvents: true }, calendar, eventData)
  expect(events.length).toBe(1)

  start = DateTime.now().minus({ days: 1 })
  end = start.plus({ hours: 1 })
  eventData = {
    summary: 'Test Event',
    start: { dateTime: start.toISO() },
    end: { dateTime: end.toISO() }
  }

  events = CalendarEvent.Build({ hidePastEvents: true }, calendar, eventData)
  expect(events.length).toBe(0)
})

// Run these tests 10 times, since we're generating random data
test.each(Array(10).fill(null))('CalendarEvent.compareTo', () => {
  const createEvent = (data) => {
    return {
      multiDay: data.multiDay ?? Math.floor(Math.random() * 2),
      fullDay: data.fullDay ?? Math.floor(Math.random() * 2),
      originalStart: data.originalStart ?? DateTime.now().plus({ days: Math.floor(Math.random() * 10) }),
      start: data.start ?? DateTime.now().plus({ days: Math.floor(Math.random() * 10) }),
      calendarSorting: data.calendarSorting ?? Math.floor(Math.random() * 10),
      summary: data.summary ?? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    }
  }

  let event1 = createEvent({ multiDay: true })
  let event2 = createEvent({ multiDay: false })
  expect([event1, event2].sort(CalendarEvent.compareTo)[0]).toBe(event1)
  expect([event2, event1].sort(CalendarEvent.compareTo)[0]).toBe(event1)

  event1 = createEvent({ multiDay: false, fullDay: true })
  event2 = createEvent({ multiDay: false, fullDay: false })
  expect([event1, event2].sort(CalendarEvent.compareTo)[0]).toBe(event1)
  expect([event2, event1].sort(CalendarEvent.compareTo)[0]).toBe(event1)

  event1 = createEvent({ multiDay: false, fullDay: false, originalStart: DateTime.local(2020, 2, 14, 11, 30) })
  event2 = createEvent({ multiDay: false, fullDay: false, originalStart: DateTime.local(2020, 2, 16, 11, 30) })
  expect([event1, event2].sort(CalendarEvent.compareTo)[0]).toBe(event1)
  expect([event2, event1].sort(CalendarEvent.compareTo)[0]).toBe(event1)

  const originalStart = DateTime.local(2020, 2, 14, 11, 30)
  event1 = createEvent({ multiDay: false, fullDay: false, originalStart, start: DateTime.local(2020, 2, 14, 11, 30) })
  event2 = createEvent({ multiDay: false, fullDay: false, originalStart, start: DateTime.local(2020, 2, 14, 11, 45) })
  expect([event1, event2].sort(CalendarEvent.compareTo)[0]).toBe(event1)
  expect([event2, event1].sort(CalendarEvent.compareTo)[0]).toBe(event1)

  event1 = createEvent({ multiDay: false, fullDay: false, originalStart, start: originalStart, calendarSorting: 1 })
  event2 = createEvent({ multiDay: false, fullDay: false, originalStart, start: originalStart, calendarSorting: 2 })
  expect([event1, event2].sort(CalendarEvent.compareTo)[0]).toBe(event1)
  expect([event2, event1].sort(CalendarEvent.compareTo)[0]).toBe(event1)

  event1 = createEvent({ multiDay: false, fullDay: false, originalStart, start: originalStart, calendarSorting: 1, summary: 'A' })
  event2 = createEvent({ multiDay: false, fullDay: false, originalStart, start: originalStart, calendarSorting: 1, summary: 'B' })
  expect([event1, event2].sort(CalendarEvent.compareTo)[0]).toBe(event1)
  expect([event2, event1].sort(CalendarEvent.compareTo)[0]).toBe(event1)
})

test('CalendarEvent.null', () => {
  expect(CalendarEvent.null()).toBeInstanceOf(CalendarEvent)
  expect(CalendarEvent.null().class).toBe('none')
})
