window.twitter_chat = {

	init: function() {
		this.bindEvents();
	},

	bindEvents: function() {
		$('#container').on('click', '.search-button', function() {
			var raw_search = $('.search-query').val();
			var formatted_search_tweet_id = twitter_chat.formatQuery(raw_search, '/');
			twitter_chat.getTweet(formatted_search_tweet_id);
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

	getTweet: function(formatted_search_tweet_id) {
		$.ajax({
			url: "https://api.twitter.com/1/statuses/show.json?id=" + formatted_search_tweet_id + "&include_entities=true",
			success: twitter_chat.buildContext,
				// call function that builds up context
				// twitter_chat.buildContext(response);
			dataType: "jsonp",
			complete: function() {
				
			}
		})
	},

	buildContext: function(response) {
		// use this to compare against response and 
		// make sure I'm not duplicating tweets on the page
		var array_includes_tweet = _.include(twitter_chat.tweets_array, response);


		// ^Don't just save an array of tweets, save an array of tweet_id_str and
		// check if the array includes a certain id_str instead of the entire response


		if (!array_includes_tweet) {
			twitter_chat.tweets_array.push(response);

			// pull out necessary data for template
			var context = {
				avatar: response.user.profile_image_url,
				screen_name: response.user.screen_name,
				real_name: response.user.name,
				time: "", // figure out how to display time in terms of 'x minutes ago'
				tweet_body: response.text,
				tweet_url: "https://twitter.com/#!/" + this.screen_name + "/status/" + response.id_str
			};

			// pass it through template and append to DOM
			$('.tweet-list').append(JST['pages/index'](context));
		}

		// check for user mentions, and if some exist, request all
		// of those users' tweets, iterate over them and find any
		// directed back at the original user
		twitter_chat.retrieveConvo(response);

		

	},

	retrieveConvo: function(original_tweet_response) {
		// clean up var declarations, comma separated list on this line
		// abstract out code of this function big time



		console.log('entered retrieveConvo');
		// https://api.twitter.com/1/statuses/show.json?id=197104866865315840&include_entities=true
		var original_screen_name = original_tweet_response.user.screen_name;
		if (!original_tweet_response.entities.user_mentions.length) {
			console.log("there is no associated conversation");
		}
		if (original_tweet_response.entities.user_mentions.length) {
			var user_mentions_count = original_tweet_response.entities.user_mentions.length;
			for (var i = 0; i < user_mentions_count; i++) {
				// get screen name from each mention
				var mentioned_user_name = original_tweet_response.entities.user_mentions[i].screen_name;
				// pull in their timeline
				var user_timeline_url = "https://api.twitter.com/1/statuses/user_timeline.json?include_entities=true&screen_name=" + mentioned_user_name + "&count=200"
				// go through each tweet and look for any user mentions to the original screen name
				$.ajax({
					url: user_timeline_url,
					success: function(response) {
						// just call another method
						var array_of_user_tweets = response.length;
						for (var i = 0; i < array_of_user_tweets; i++) {
							var this_tweet = response[i];
							if (this_tweet.entities.user_mentions.length) {
								for (var j = 0; j < this_tweet.entities.user_mentions.length; j++) {
									if ((this_tweet.entities.user_mentions[j].screen_name === original_screen_name) && (twitter_chat.tweets_array.length < 5)) {
										// console.log("yar", this_tweet.entities.user_mentions[j].screen_name);
										twitter_chat.getTweet(this_tweet.id_str)
									} else {
										console.log('hit maximum requests');
									}
								}
							}
						}
					},
					dataType: "jsonp"
				});
			}
		}
	}

	// https://api.twitter.com/1/statuses/user_timeline.json?include_entities=true&screen_name=maxjkatz&count=200

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