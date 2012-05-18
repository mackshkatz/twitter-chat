describe('Twitter Chat', function() {
	it('should pull out the tweet id', function() {
		expect(tc.formatQuery('https://twitter.com/#!/maxjkatz/status/203240662383083520', '/')).toEqual([screen_name: 'maxjkatz', tweet_id: '203240662383083520'])
	});
});