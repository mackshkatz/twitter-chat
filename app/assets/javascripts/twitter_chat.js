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

	// populate this array each time I build up a context
	// object, and this way if I need to order tweets by
	// time, I have access to them
	tweets_array: [],

	getTweets: function(search_query) {
		$.ajax({
			url: search_query,
			success: function(response) {
				// call function that builds up context
				twitter_chat.buildContext(response);
				
				// if tweet is part of convo, request another tweet part of that convo
				// if (response.in_reply_to_) {
				// 	search_query = response.in_reply_to
				// }

			},
			dataType: "jsonp",
			complete: function() {
				
			}
		})
	},

	buildContext: function(response) {
		// retrieved tweet and pulled out necessary data for template
		var context = {
			avatar: response.user.profile_image_url,
			screen_name: response.user.screen_name,
			real_name: response.user.name,
			time: "", // figure out how to display time in terms of 'x minutes ago'
			tweet_body: response.text,
			tweet_url: "https://twitter.com/#!/" + this.screen_name + "/status/" + response.id
		};

		twitter_chat.tweets_array.push(context);

		// pass it through template and append to DOM
		$('.tweet-list').append(JST['pages/index'](context));
	}


	// tweets = []

	// get_first_tweet -> data
	// 	tweets.push data
	// 	// data.user.screen_name
	// 	data.entities.user_mentions.each
	// 		get_all_tweets_for_user_in_timeframe(user.screen_name)
	// 			examine the tweet to see if they mentioned the original user
	// 			push tweet data into the tweets collection
	// 			resort the tweets collection
	// 			regeneration/reorder the html

	// 		get_data_on_that_tweet -> other_data
}

$(document).ready(function() {
	twitter_chat.init();
});