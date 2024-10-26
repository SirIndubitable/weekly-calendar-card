/* global customElements */
import { WeeklyCalendarCard } from './card'

customElements.define('weekly-calendar-card', WeeklyCalendarCard)

// customElements.define("my-calendar-card-editor", CustomCalendarCardEditor);

window.customCards = window.customCards || []
window.customCards.push({
  type: 'weekly-calendar-card',
  name: 'Weekly Calendar Card',
  preview: false,
  description: 'A card that shows week by week calendar events, starting with this week.',
  documentationURL:
    'https://github.com/SirIndubitable/weekly-calendar-card'
})
