let _browsers = [];

module.exports = {
    web: (count, url, options) => {
        if (typeof count === 'string') {
            options = url;
            url = count;
            count = 1;
        }
        if (!url || typeof url !== 'string') {
            return Promise.reject(new Error('Invalid URL'));
		}
		options = options || {};
		// Running headless has some differences and is not supported.
		// For example: Throwing an error after test.async() does not fail the test!
		options.headless = false;
        try {
			const puppeteer = require('puppeteer');
			return (async () => {
				console.log('Opening browser with puppeteer...');
				let browser = await puppeteer.launch(options);
				_browsers.push(browser);
				let pages = await Promise.all(Array(count).fill(0).map((x, i) => {
					console.log('Opening browser page ' + i + ' with puppeteer...');
					return (async () => {
						let page = await browser.newPage();

						page.on('console', msg => {
							if (msg.text() === 'JSHandle@object') {
								// FIXME: Avoid text comparison
								return;
							}
							console.log(`${i} [${msg.type()}]: ${msg.text()}`);
						});

						// await page.setCacheEnabled(false);
						await page.goto(url);
						console.log('Browser page ' + i + ' open');
						if (options.scripts) {
							await Promise.all((options.scripts || []).map(scriptOpts => {
								if (typeof scriptOpts === 'string') {
									scriptOpts = {
										url: scriptOpts,
										type: 'text/javascript',
									};
								}
								console.log(`Browser page ${i} loading script: ${scriptOpts.url || scriptOpts.path || '(raw js)'}`)
								return page.addScriptTag(scriptOpts);
							}));
							console.log('Browser page ' + i + ' loaded all scripts');
						}
						return page;
					})();
				}));
				console.log('Browser ready');
				return {
					browser,
					pages,
				}
			})();
		} catch (err) {
			console.log("PLEASE OPEN "+ url +" IN "+ count +" BROWSER(S)!");
			console.warn('Consider installing puppeteer to automate browser management (npm i -g puppeteer && npm link puppeteer)');
			return Promise.resolve();
		}
	},
	cleanup: () => {
		if (_browsers.length === 0) {
			return undefined;
		}
		console.log('Closing all puppeteer browsers...');
		return Promise.all(_browsers.map(b => b.close()))
			.then(() => console.log('Closed all puppeteer browsers'));
	}
}
