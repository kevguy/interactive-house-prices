import madlib from '../lib/madlib';
import template from './templates/controls.html!text';

export default function Controls(el, showDistrict, showPosition) {
    function init() {
        el.innerHTML += template;

        madlib(el.querySelector('.js-location'), [], () => true, v => v, v => v, postcode => {
            if (postcode.length > 0) {
                let district = (postcode.length > 4 ? postcode.substring(0, postcode.length - 3) : postcode);
                showDistrict(district.trim().toUpperCase());
            }
        });

        if ('geolocation' in navigator) {
            let userLocationEl = el.querySelector('.js-user-location');
            userLocationEl.style.display = 'block';
            userLocationEl.addEventListener('click', () => {
                userLocationEl.classList.remove('has-error');
                userLocationEl.classList.add('is-loading');

                navigator.geolocation.getCurrentPosition(function (position) {
                    showPosition([position.coords.latitude, position.coords.longitude], () => {
                        userLocationEl.classList.remove('is-loading');
                    });
                }, function (err) {
                    console.log(err);
                    userLocationEl.classList.remove('is-loading');
                    userLocationEl.classList.add('has-error');
                });

                userLocationEl.blur();
            });
        }
    }

    init();
}
