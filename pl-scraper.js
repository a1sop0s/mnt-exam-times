const axios = require('axios').default;
const cheerio = require('cheerio');

const url = 'https://eteenindus.mnt.ee/public/vabadSoidueksamiajad.xhtml';
const webhook = 'Insert your Discord webhook here';

const cityFilters = ['Tallinn', 'Tartu']

// Previous times are stored here, for checks
let prevTimes = [];

// Restart the program, looks cleaner this way.
function restartProgram() {
    setTimeout(retrieveTimes, 3000);
}

// Post updated times to webhook
function postUpdate(name, time) {
    console.log(name, time);
    console.log(prevTimes);
    return axios.post(webhook, {
        username: `Sõidueksamite ajad - ${name}`,
        content: `\`${time}\``
    });
}

function checkForChange(data) {
    // On initiation  add current values to prevTimes
    if (!prevTimes.length) {
        console.log("Started time watching");
        console.log(data);
        return prevTimes = data;
    } else {
        // Filter through bureau and its times
        for (const bureau of data) {
            for (const time of bureau.times) {
                const _bureau = prevTimes.find(b => b.name === bureau.name);

                // Post times that don't match to anything in prevTimes
                if (!_bureau.times.includes(time.toString())) {
                    console.log(`* ${JSON.stringify(prevTimes)}`);
                    console.log(`* ${_bureau.times.indexOf(time.toString())}`);
                    prevTimes = data;
                    // Index was -1; console.log(_bureau.times.indexOf(time))
                    postUpdate(bureau.name, time);
                }
            }
        }
    }
}

// Remove unwanted bureaus
function filterByBureau(item) {
    return cityFilters.some(substring => item.name.includes(substring));
}

// Scrapes the URL and passes exam times, called by setInterval.
function retrieveTimes() {
    axios(url)
    .then(response => {
        const html = response.data;
        const $ = cheerio.load(html);
        const examTimesTable = $('.ui-datatable-data > tr')
        const availableTimes = [];

        examTimesTable.each(function() {
            const rawTimes = $(this).find('.eksam-ajad-aeg').text();

            const name = $(this).find('.eksam-ajad-byroo').text();
            const times = [];

            // Slices the collected times by their standard length, to push into
            // the array
            times.push(
                rawTimes.slice(0, 16),
                rawTimes.slice(16, 32),
                rawTimes.slice(32)
            );

            availableTimes.push({
                name,
                times
            });
        });

        let filteredArray = availableTimes.filter(filterByBureau).sort();
        return checkForChange(filteredArray);
    })
    .catch(console.error);
}

setInterval(retrieveTimes, 3000);