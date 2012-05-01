window.twitter_chat = {

	init: function() {
		this.bindEvents();
	},

	bindEvents: function() {
		$('.search-button').click(function() {
			var search_query = $('.search-query').val();
			twitter_chat.getTweets(search_query);
		});
	},

	getTweets: function(search_query) {
		$.ajax({
			url: search_query,
			success: function(response) {
				console.log(response)
				// retrieve tweet and pull out necessary date for template
				// pass it through template and append to DOM
			},
			dataType: "jsonp",
			complete: function(response) {
				console.log("completed", response)
				// if tweet is part of convo, request another tweet part of that convo
			}
		})
	}

	// context: {
	// 	time: "1",
	// 	avatar: "",
	// 	screen_name: "1",
	// 	real_name: "1",
	// 	tweet_body: "1",
	// 	tweet_url: "1",
	// }

	// $('.tweet-list').append(JST['pages/index']("test"));
}

$(document).ready(function() {
	twitter_chat.init();
});