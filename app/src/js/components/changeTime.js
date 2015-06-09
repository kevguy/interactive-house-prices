import prices from '../data/areas-prices.json!json'

const years = [2014, 2015];

export default class ChangeTime {
    constructor(el, map, areasLayer) {
        this.statusEl = el.querySelector('#status');
        this.timeEl = el.querySelector('#slider');
        this.yearEl = el.querySelector('#year');
        this.monthEl = el.querySelector('#month');

        this.areasLayer = areasLayer;

        this.timeEl.addEventListener('input', evt => {
            var date = evt.target.value / 1000 * years.length * 12;
            var year = Math.floor(date / 12) + parseInt(years[0]);
            var month = Math.floor(date % 12) + 1;

            this.changeTime(year, month);
        });

        this.changeTime(2014, 1);
    }

    changeTime(year, month) {
        this.yearEl.textContent = year;
        this.monthEl.textContent = month < 10 ? '0' + month : month;

        this.areasLayer.setStyle(area => {
            var price = prices[area.id][year][month] / 25000;
            var c = Math.floor((1 - Math.min(1, price / 10)) * 255);
            return {
                'color': `rgb(${c}, ${c}, ${c})`
            };
        });
    }
}