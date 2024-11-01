export default `
    ha-card {
        --days-spacing: 10px;
        --day-date-number-font-size: 1.2rem;
        --day-date-number-line-height: 1.4rem;
        --events-margin-top: 10px;
        --event-spacing: 5px;
        --event-border-width: 5px;
        --event-border-radius: 10px;
        --event-font-size: 0.85rem;
        --event-line-height:  1.2rem;
        --event-icon-size: 18px;
    }

    .grid-container {
        container-name: weekplanner;
        container-type: inline-size;
        display: grid;
        flex-wrap: wrap;
        grid-template-columns: repeat(7, calc(100% / 7));
    }

    .grid-container .heading {
        font-size: 1.3rem;
        line-height: 1.5rem;
        width: 100%;
        margin: 4px;
        margin-left: var(--days-spacing);
    }

    .grid-container .day {
        position: relative;
        width: 100%;
        min-height: 15rem;
    }

    .grid-container .day.past {
        opacity: 0.5;
    }

    .grid-container .day hr {
        color: transparent;
        border-top-width: 2px;
        border-top-style: solid;
        border-top-color: var(--primary-text-color);
        margin-bottom: 9px;
    }

    .grid-container .day.today hr {
        color: transparent;
        border-top-width: 4px;
        border-top-color: var(--accent-color);
        margin-bottom: 7px;
    }

    .grid-container .day .date {
        position: relative;
        z-index: 1;
        margin-left: var(--days-spacing);
        margin-right: var(--days-spacing);
    }

    .grid-container .day .date .number {
        font-size: var(--day-date-number-font-size);
        line-height: var(--day-date-number-line-height);
    }

    .grid-container .day .events {
        margin-top: var(--events-margin-top);
    }

    .grid-container .day .events .none,
    .grid-container .day .events .event {
        margin-bottom: var(--event-spacing);
        border-radius: var(--event-border-radius);
        font-size: var(--event-font-size);
        line-height: var(--event-line-height);
    }

    .grid-container .day .events .event {
        margin-left: var(--days-spacing);
    }

    .grid-container .day .events .fullday {
        margin-left: 10px;
        margin-right: 10px;
        border-radius: 10px;
        text-align: center;
    }

    .grid-container .day .events .multiday {
        margin-left: 0px;
        margin-right: 0px;
        text-align: center;
        border-radius: 0px;
    }

    .grid-container .day .events .start {
        margin-left: 10px;
        border-top-left-radius: var(--event-border-radius);
        border-bottom-left-radius: var(--event-border-radius);
    }

    .grid-container .day .events .end {
        margin-right: 10px;
        border-top-right-radius: var(--event-border-radius);
        border-bottom-right-radius: var(--event-border-radius);
    }

    .grid-container .day .events .event .title {
        padding: 0px var(--event-border-radius);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .loader {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 40px;
        height: 40px;
    }

    .loader:after {
        content: " ";
        display: block;
        width: 24px;
        height: 24px;
        margin: 4px;
        border-radius: 50%;
        border: 3px solid var(--primary-text-color);
        border-color: var(--primary-text-color) transparent var(--primary-text-color) transparent;
        animation: loader 1.2s linear infinite;
    }

    ha-dialog .calendar,
    ha-dialog .datetime,
    ha-dialog .location {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
    }

    ha-dialog .calendar ha-icon,
    ha-dialog .datetime ha-icon,
    ha-dialog .location ha-icon {
        margin-right: 8px;
    }

    ha-dialog .location .info a {
        color: var(--primary-text-color);
    }

    ha-dialog .description {
        border-top: 1px solid var(--primary-text-color);
        margin-top: 16px;
        padding-top: 16px;
    }

    @keyframes loader {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`
