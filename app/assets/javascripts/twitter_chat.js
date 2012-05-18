(function($, window) {
	"use strict";
	var tc = {
		all_tweets: [],
		original_user_mentions: [],
		original_screen_name: null,
		original_tweet_time: null,
		formatted_tweets: [],
		previously_formatted_tweets: [],
		click_counter: 0,
		getMentionedUserTimelineReceived: 0,
		twitter_api: "https://api.twitter.com/1/statuses",

		init: function() {
			this.bindEvents();
		},


		bindEvents: function() {
			$('#container').on('click', '#search-button', function() {
				$('.loading-layer, .loading-icon').show();
				$('.error-message').remove();
				tc.click_counter++;
				tc.previously_formatted_tweets = tc.formatted_tweets;
				tc.resetProperties();
				tc.grabParams();
			});
		},

		// Internal: Sets the necessary user info to variables.
		// Returns nothing.
		grabParams: function() {
			var raw_search = $('#search-query').val();
			var formatted_search_info = tc.formatQuery(raw_search, '/');
			var formatted_tweet_id = formatted_search_info.tweet_id;
			var formatted_screen_name = formatted_search_info.screen_name;
			tc.original_screen_name = formatted_screen_name;
			tc.startRequests(formatted_tweet_id, formatted_screen_name);
		},

		// Internal: Splits the url to find the necesssary user info.
		// string_to_split - The url the user submits.
		// separator			 - The String that is used to know what to split the url
		//									 on.
		// Returns an array of two items. The first item is the screen name of the 
		//   person who tweeted the requested tweet. The second item is the id of 
		//   the given tweet.
		formatQuery: function(string_to_split, separator) {
			var array_of_split_string = string_to_split.split(separator);
			var screen_name = array_of_split_string[array_of_split_string.length - 3];
			var tweet_id = array_of_split_string[array_of_split_string.length - 1];
			return {
				'screen_name': screen_name,
				'tweet_id': tweet_id
			};
		},

		// Internal: Calls the methods that initiate the first ajax requests.
		// formatted_tweet_id    - The id of the tweet requested.
		// formatted_screen_name - The screen name of the user who tweeted the
		//												 requested tweet.
		// Returns nothing.
		startRequests: function(formatted_tweet_id, formatted_screen_name) {
			tc.getRequestedTweet(formatted_tweet_id);
			tc.getOriginalAuthorTimeline(formatted_screen_name, formatted_tweet_id);
		},


		resetProperties: function() {
			tc.getMentionedUserTimelineReceived = 0;
			tc.all_tweets = [];
			tc.formatted_tweets = [];
		},

		// Internal: Makes a GET request to the twitter api for the tweet requested.
		// formatted_tweet_id - The id of the tweet requested.
		// Returns nothing.
		getRequestedTweet: function(formatted_tweet_id) {
			$.ajax({
				url: tc.twitter_api + "/show.json?id=" + formatted_tweet_id + "&include_entities=true",
				success: function(response) {
					tc.original_tweet_time = (new Date(response.created_at)).valueOf();
					tc.checkUserMentions(response);
				},
				timeout: 10000,
				error: function() {
					$('.loading-layer, .loading-icon').hide();
					$('.tweet-list').append(JST['pages/error']());
				},
				dataType: "jsonp"
			});
		},

		// Internal: Builds up array of all the users mentioned in the requested
		//					 tweet.
		// response - Tweet object returned from ajax request.
		// Returns nothing.
		checkUserMentions: function(response) {
			var user_mentions = response.entities.user_mentions.length;
			if (user_mentions) {
				for (var i = 0; i < user_mentions; i++) {
					tc.original_user_mentions.push(response.entities.user_mentions[i].screen_name);
				}
			} else if (user_mentions === 0) {
				tc.all_tweets.push(response);
				tc.maybeRenderTweets();
				$('.tweet-list').append(JST['pages/noconvo']());
			}
			tc.getMentionedUserTimeline(tc.original_user_mentions);
		},

		// Internal: Makes a GET request to the twitter api for the timeline of the
		//					 user who tweeted the requested tweet.
		// formatted_screen_name - The screen name of the user who tweeted the
		//   											 requested tweet.
		// formatted_tweet_id    - The id of the tweet requested.
		// Returns nothing.
		getOriginalAuthorTimeline: function(formatted_screen_name, formatted_tweet_id) {
			$.ajax({
				url: tc.twitter_api + "/user_timeline.json?include_entities=true&screen_name=" + formatted_screen_name + "&count=200",
				success: tc.filterOriginalAuthorTimeline,
				dataType: "jsonp"
			});
		},

		// Internal: Checks all of the returned tweets from the timeline to see if
		//					 any of them mention the same users who were mentioned in the 
		//					 original tweet, and that they haven't already been pushed into 
		//					 the all_tweets array. If that's the case, then it pushes that 
		//					 tweet into the all_tweets array.
		// response - Array of tweet objects belonging to the user who tweeted the
		//					  requested tweet.
		// Returns nothing.
		filterOriginalAuthorTimeline: function(response) {
			var total_user_tweets = response.length;
			for (var i = 0; i < total_user_tweets; i++) {
				var this_tweet = response[i];
				var total_user_mentions = this_tweet.entities.user_mentions.length;
				for (var j = 0; j < total_user_mentions; j++) {
					if ((_.include(tc.original_user_mentions, this_tweet.entities.user_mentions[j].screen_name))) {
						if (!_.detect(tc.all_tweets, function(t) { return t.id_str === this_tweet.id_str;})) {
							tc.all_tweets.push(this_tweet);
						}
					}
				}
			}
		},

		// Internal: Makes a GET request to the twitter api for the timeline of all
		//					 the mentioned users in the requested tweet.
		// Returns nothing.
		getMentionedUserTimeline: function() {
			var total_user_mentions = tc.original_user_mentions.length;
			for (var i = 0; i < total_user_mentions; i++) {
				$.ajax({
					url: tc.twitter_api + "/user_timeline.json?include_entities=true&screen_name=" + tc.original_user_mentions[i] + "&count=200",
					success: function(response) {
						tc.filterMentionedUserTimeline(response);
						tc.maybeRenderTweets();
					},
					dataType: "jsonp"
				});
			}
		},

		// Internal: Checks all of the returned tweets from the timeline to see if
		//					 any of them mention the user who tweeted the original tweet,
		//					 and that they haven't already been pushed into the all_tweets
		//					 array. If that's the case, then it pushes that tweet into the 
		//					 all_tweets array.
		// response - Array of tweet objects belonging to one of the mentioned users
		//					  from the requested tweet.
		// Returns nothing.
		filterMentionedUserTimeline: function(response) {
			var total_user_tweets = response.length;
			for (var i = 0; i < total_user_tweets; i++) {
				var this_tweet = response[i];
				var total_user_mentions = this_tweet.entities.user_mentions.length;
				for (var j = 0; j < total_user_mentions; j++) {
					if ((this_tweet.entities.user_mentions[j].screen_name === tc.original_screen_name)) {
						if (!_.detect(tc.all_tweets, function(t) { return t.id_str === this_tweet.id_str;})) {
							tc.all_tweets.push(this_tweet);
						}
					}
				}
			}
		},

		// Internal: Goes through all the tweets that have been picked out from the
		//					 timelines, makes sure they are within a given time range, and
		//					 builds them up to fit the format of the tweet template.
		// Returns nothing.
		buildContext: function() {
			tc.sortTweets();
			var regex_replacement = JST['pages/regex']();
			var all_tweets_len = tc.all_tweets.length;
			for (var i = 0; i < all_tweets_len; i++) {
				var current_tweet = tc.all_tweets[i];
				var created_time = (new Date(current_tweet.created_at)).valueOf();
				if (Math.abs(tc.original_tweet_time - created_time) < 86400000) {
					var context = {
						id_str: current_tweet.id_str,
						avatar: current_tweet.user.profile_image_url,
						screen_name: current_tweet.user.screen_name,
						real_name: current_tweet.user.name,
						time: (new Date(current_tweet.created_at)).toISOString(),
						tweet_body: (current_tweet.text).replace(/@([a-z0-9_]+)/gi, regex_replacement),
						tweet_url: "https://twitter.com/#!/" + current_tweet.user.screen_name + "/status/" + current_tweet.id_str
					};
					if (created_time === tc.original_tweet_time) {
						context.li_class = "original-tweet"; 
					}
					tc.formatted_tweets.push(context);
				}
			}
		},

		// Internal: Sorts all of the tweets that have been picked out from the
		// 					 timelines and sorts them from most recent to oldest.
		// Returns nothing.
		sortTweets: function() {
			tc.all_tweets.sort(function(a, b) {
				var tweet_time_a = new Date(a.created_at);
				var tweet_time_b = new Date(b.created_at);
				return tweet_time_b - tweet_time_a;
			});
		},

		// Internal: Keeps track of how many timelines have been pulled down, and
		//					 once it is equal to the amount of mentioned users in the
		//					 requested tweet it will actually render them.
		// Returns nothing.
		maybeRenderTweets: function() {
			tc.getMentionedUserTimelineReceived += 1;
			if (tc.getMentionedUserTimelineReceived >= tc.original_user_mentions.length) {
				tc.buildContext();
				$('.loading-layer, .loading-icon').hide();
				tc.applyProperTweets();
			if (tc.formatted_tweets.length === 1) {
				$('.tweet-list').append(JST['pages/noconvo']());
			}
				$("abbr.timeago").timeago();
			}
		},

		// Internal: Allows user to click on button again, which makes the same
		//					 requests as before, but only adds on new tweets if any have
		//					 been made.
		// Returns nothing.
		applyProperTweets: function() {
			var array_of_previous_tweet_ids = _.pluck(tc.previously_formatted_tweets, 'id_str');
			tc.new_live_tweets = _.reject(tc.formatted_tweets, function(tweet) {
				return _.include(array_of_previous_tweet_ids, tweet.id_str);
			});
			for (var i = 0; i < tc.new_live_tweets.length; i++) {
				tc.previously_formatted_tweets.push(tc.new_live_tweets[i]);
			}
			if (tc.click_counter === 1) {
				$('.tweet-list').append(JST['pages/index']({'formatted_tweets': tc.formatted_tweets}));
			} else if (tc.click_counter > 1) {
				$('.tweet-list').prepend(JST['pages/index']({'formatted_tweets': tc.new_live_tweets}));
			}
			tc.previously_formatted_tweets.push(tc.new_live_tweets);
			tc.formatted_tweets = tc.previously_formatted_tweets;
		}
	};

	window.tc = tc;

	$(document).ready(function() {
		tc.init();
	});
})(jQuery, this);