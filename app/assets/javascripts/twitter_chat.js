window.twitter_chat = {

	init: function() {
		this.bindEvents();
	},

	bindEvents: function() {
		$('.search-button').click(function() {
			var raw_search = $('.search-query').val();
			var formatted_search_tweet_id = twitter_chat.formatQuery(raw_search, '/');

			twitter_chat.getTweets(formatted_search_tweet_id);
		});
	},

	// populate this array each time I build up a context
	// object, and this way if I need to order tweets by
	// time, I have access to them
	tweets_array: [],

	formatQuery: function(string_to_split, separator) {
		var array_of_split_string = string_to_split.split(separator);
		// var tweet_screen_name = array_of_split_string[array_of_split_string.length - 3];
		var tweet_status_id = array_of_split_string[array_of_split_string.length - 1];
		return tweet_status_id;
	},

	getTweets: function(formatted_search_tweet_id) {
		$.ajax({
			url: "https://api.twitter.com/1/statuses/show.json?id=" + formatted_search_tweet_id + "&include_entities=true",
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

		// check for user mentions, and if some exist, request all
		// of those users' tweets, iterate over them and find any
		// directed back at the original user


		// pass it through template and append to DOM
		$('.tweet-list').append(JST['pages/index'](context));
	}

	// .*?twitter.com/#!/(.*?)/status/(\d+)

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