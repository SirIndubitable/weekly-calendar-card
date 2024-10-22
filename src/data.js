import { DateTime } from "luxon"

export class Helpers {
    static mod(n, m) {
        // Custom mod because js default % is bad
        return ((n % m) + m) % m;
    }

    static convertApiDate(apiDate) {
        let date = null;

        if (apiDate) {
            if (apiDate.dateTime) {
                date = DateTime.fromISO(apiDate.dateTime);
            } else if (apiDate.date) {
                date = DateTime.fromISO(apiDate.date);
            }
        }

        return date;
    }

    static isSameDay(date1, date2) {
        return date1.hasSame(date2, 'day');
    }

    static isFullDay(startDate, endDate, multiDay) {
        if (
            startDate === null
            || endDate === null
            || startDate.hour > 0
            || startDate.minute > 0
            || startDate.second > 0
            || endDate.hour > 0
            || endDate.minute > 0
            || endDate.second > 0
        ) {
            return false;
        }

        return multiDay || Math.abs(startDate.diff(endDate, 'days').toObject().days) === 1;
    }

    isToday(date) {
        return Helpers.isSameDay(date, DateTime.now());
    }

    isTomorrow(date) {
        return Helpers.isSameDay(date, DateTime.now().plus({ days: 1 }));
    }

    isYesterday(date) {
        return Helpers.isSameDay(date, DateTime.now().minus({ days: 1 }));
    }
}

export class CalendarEvent {
    constructor(event, startDate, endDate, calendar) {
        this.start = startDate;
        this.end = endDate;
        this.summary = event.summary ?? null;
        this.originalStart = Helpers.convertApiDate(event.start);
        this.originalEnd = Helpers.convertApiDate(event.end);
        if (this.originalStart != null && this.originalEnd != null) {
            this.fullDay = Helpers.isFullDay(this.originalStart, this.originalEnd);
            this.multiDay = !this.fullDay && !Helpers.isSameDay(this.originalStart, this.originalEnd);
        }
        else {
            this.fullDay = false;
            this.multiDay = false;
        }
        this.color = calendar.color ?? 'inherit';
        this.calendar = calendar;
        this.calendar_entity = calendar.entity ?? "";
        this.calendarSorting = calendar.sorting ?? 100;
        this.prefix = CalendarEvent._getPrefix(this.summary, this.calendar.prefix),
        this.class = CalendarEvent._getEventClass(
            this.multiDay,
            this.fullDay,
            this.start,
            this.end,
            this.originalStart,
            this.originalEnd)
    }

    renderSummary(config) {
        const empty = '\xa0';

        if (this.summary == null) {
            return empty;
        }

        let summary = this.summary;
        if (this.prefix != null) {
            summary = this.prefix + " " + summary;
        }

        if (this.fullDay) {
            return summary;
        }

        const formattedStart = this.start.toFormat(config.timeFormat).replace("AM", "am").replace("PM","pm");
        const formattedEnd = this.end.toFormat(config.timeFormat).replace("AM", "am").replace("PM","pm");

        if (this.multiDay) {
            const isFullDay = Helpers.isFullDay(this.start, this.end);
            const isStart = +this.start === +this.originalStart;
            const isEnd = +this.end === +this.originalEnd
            const isStartOfWeek = this.start.weekday == config.startOfWeek;

            // Start of week, we should display the summary since it's not connected to the rest of the event
            if ((isStart && isFullDay)
             || (isStartOfWeek && !isStart && !isEnd)
             || (isStartOfWeek && isEnd && isFullDay)) {
                return summary;
            }

            // This is the first day of the event
            if (isStart) {
                return`${formattedStart} ${summary}`;
            }

            // This is the last day of the event
            if (isEnd && !isFullDay) {
                if (isStartOfWeek) {
                    return `${summary} ${formattedEnd}`;
                }

                return `${formattedEnd}`;
            }

            // Any other day
            return empty;
        }

        return `${formattedStart} ${summary}`;
    }

    static Build(config, calendar, eventData) {
        if (CalendarEvent._shouldFilterEvent(eventData, config.filter)) {
            return [];
        }
        if (CalendarEvent._shouldFilterEvent(eventData, calendar.filter)) {
            return [];
        }

        let startDate = Helpers.convertApiDate(eventData.start);
        let endDate = Helpers.convertApiDate(eventData.end);

        if (config.hidePastEvents && endDate < DateTime.now()) {
            return [];
        }

        let fullDay = Helpers.isFullDay(startDate, endDate);

        if (!fullDay && !Helpers.isSameDay(startDate, endDate)) {
            let events = []
            while (startDate < endDate) {
                let eventStartDate = startDate;
                startDate = startDate.plus({ days: 1 }).startOf('day');
                let eventEndDate = startDate < endDate ? startDate : endDate;

                events.push(new CalendarEvent(eventData, eventStartDate, eventEndDate, calendar));
            }

            return events;
        }
        else {
            return [new CalendarEvent(eventData, startDate, endDate, calendar)]
        }
    }

    static _shouldFilterEvent(event, filter) {
        if (filter == null) {
            return false;
        }

        return event.summary.match(filter);
    }

    static _getPrefix(summary, prefix) {
      if (prefix == null) {
          return null
      }

      if (typeof prefix === 'string' || prefix instanceof String) {
          return prefix;
      }

      let default_prefix = null;
      for (const [regex, value] of Object.entries(prefix)) {
          if (regex === "default") {
              default_prefix = value;
              continue;
          }

          if (!summary.match(regex)) {
              continue;
          }

          return value;
      }

      if (default_prefix != null) {
          return default_prefix;
      }

      return null;
    }

    static _getEventClass(multiDay, fullDay, start, end, originalStart, originalEnd) {
        let classes = [];
        let now = DateTime.now();
        if (multiDay) {
            classes.push('multiday');
            if (Helpers.isSameDay(originalStart, start)) {
                classes.push("start")
            }
            if (Helpers.isSameDay(originalEnd, end)) {
                classes.push('end')
            }
        }
        if (fullDay) {
            classes.push('fullday');
        }
        if (end < now) {
            classes.push('past');
        } else if (start <= now && end > now) {
            classes.push('ongoing');
        } else {
            classes.push('future');
        }
        return classes.join(' ');
    }

    static null() {
        let event = new CalendarEvent({}, null, null, {});
        event.class = 'none';
        return event;
    }

    static compareTo(event1, event2) {
        if (event1.multiDay != event2.multiDay)
        {
            return event1.multiDay ? -1 : 1;
        }

        if (event1.fullDay != event2.fullDay)
        {
            return event1.fullDay ? -1 : 1;
        }

        if (event1.originalStart.day !== event2.originalStart.day)
        {
            return event1.originalStart < event2.originalStart ? -1 : 1;
        }

        if (+event1.start !== +event2.start) {
            return event1.start < event2.start ? -1 : 1;
        }

        if (event1.calendarSorting !== event2.calendarSorting) {
            return event1.calendarSorting < event2.calendarSorting ? -1 : 1;
        }

        return event1.summary.localeCompare(event2.summary);
    }
}
