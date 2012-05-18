(function($, window) {
	"use strict";
	window.tc = {

		all_tweets: [],
		original_user_mentions: [],
		original_screen_name: null,
		original_tweet_time: null,
		formatted_tweets: [],
		previously_formatted_tweets: [],
		click_counter: 0,
		getMentionedUserTimelineReceived: 0,
		twitter_api: "https://api.twitter.com/1/statuses",
		$no_convo_message: $('<li class="tweet error-message"><p>No conversation exists for this tweet</p></li>'),
		$error_message: $('<li class="tweet error-message"><p>An error has occurred</p></li>'),

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

		grabParams: function() {
			var raw_search = $('#search-query').val();
			var formatted_search_info = tc.formatQuery(raw_search, '/');
			var formatted_tweet_id = formatted_search_info.tweet_id;
			var formatted_screen_name = formatted_search_info.screen_name;
			tc.original_screen_name = formatted_screen_name;
			tc.startRequests(formatted_tweet_id, formatted_screen_name);
		},

		formatQuery: function(string_to_split, separator) {
			var array_of_split_string = string_to_split.split(separator);
			var screen_name = array_of_split_string[array_of_split_string.length - 3];
			var tweet_id = array_of_split_string[array_of_split_string.length - 1];
			return {
				'screen_name': screen_name,
				'tweet_id': tweet_id
			};
		},

		startRequests: function(formatted_tweet_id, formatted_screen_name) {
			tc.getRequestedTweet(formatted_tweet_id);
			tc.getOriginalAuthorTimeline(formatted_screen_name, formatted_tweet_id);
		},

		resetProperties: function() {
			tc.getMentionedUserTimelineReceived = 0;
			tc.all_tweets = [];
			tc.formatted_tweets = [];
			// $('.tweet-list').children().remove();
		},

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
					tc.$error_message.appendTo('.tweet-list');
				},
				dataType: "jsonp"
			});
		},

		checkUserMentions: function(response) {
			var user_mentions = response.entities.user_mentions.length;
			if (user_mentions) {
				for (var i = 0; i < user_mentions; i++) {
					tc.original_user_mentions.push(response.entities.user_mentions[i].screen_name);
				}
			} else if (user_mentions === 0) {
				tc.all_tweets.push(response);
				tc.maybeRenderTweets();
				// $('.tweet-list').append(JST['pages/noconvo'])();
				tc.$no_convo_message.appendTo('.tweet-list');
			}
			tc.getMentionedUserTimeline(tc.original_user_mentions);
		},

		getOriginalAuthorTimeline: function(formatted_screen_name, formatted_tweet_id) {
			$.ajax({
				url: tc.twitter_api + "/user_timeline.json?include_entities=true&screen_name=" + formatted_screen_name + "&max_id=" + formatted_tweet_id + "&count=200",
				success: tc.filterOriginalAuthorTimeline,
				dataType: "jsonp"
			});

			$.ajax({
				url: tc.twitter_api + "/user_timeline.json?include_entities=true&screen_name=" + formatted_screen_name + "&since_id=" + formatted_tweet_id + "&count=200",
				success: tc.filterOriginalAuthorTimeline,
				dataType: "jsonp"
			});
		},

		filterOriginalAuthorTimeline: function(response) {
			var total_user_tweets = response.length;
			for (var i = 0; i < total_user_tweets; i++) {
				var this_tweet = response[i];
				var total_user_mentions = this_tweet.entities.user_mentions.length;
				for (var j = 0; j < total_user_mentions; j++) {
					if ((_.include(tc.original_user_mentions, this_tweet.entities.user_mentions[j].screen_name)) && (!_.detect(tc.all_tweets, function(t) { return t.id_str === this_tweet.id_str;}))) {
						tc.all_tweets.push(this_tweet);
					}
				}
			}
		},

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

		filterMentionedUserTimeline: function(response) {
			var total_user_tweets = response.length;
			for (var i = 0; i < total_user_tweets; i++) {
				var this_tweet = response[i];
				var total_user_mentions = this_tweet.entities.user_mentions.length;
				for (var j = 0; j < total_user_mentions; j++) {
					if ((this_tweet.entities.user_mentions[j].screen_name === tc.original_screen_name) && (!_.detect(tc.all_tweets, function(t) { return t.id_str === this_tweet.id_str;}))) {
						tc.all_tweets.push(this_tweet);
					}
				}
			}
		},

		buildContext: function() {
			tc.sortTweets();
			var all_tweets_len = tc.all_tweets.length;
			for (var i = 0; i < all_tweets_len; i++) {
				var current_tweet = tc.all_tweets[i];
				var created_time = (new Date(current_tweet.created_at)).valueOf();
				// check if tweet time is within 1 day of original tweet time // 86,400,000ms/day
				if (Math.abs(tc.original_tweet_time - created_time) < 86400000) {
					var context = {
						id_str: current_tweet.id_str,
						avatar: current_tweet.user.profile_image_url,
						screen_name: current_tweet.user.screen_name,
						real_name: current_tweet.user.name,
						time: (new Date(current_tweet.created_at)).toISOString(),
						tweet_body: (current_tweet.text).replace(/@([a-z0-9_]+)/gi, '<a class="user-mention" href="http://twitter.com/$1" target="_blank">@$1</a>'),
						tweet_url: "https://twitter.com/#!/" + current_tweet.user.screen_name + "/status/" + current_tweet.id_str
					};
					if ((new Date(current_tweet.created_at)).valueOf() === tc.original_tweet_time) {
						context.li_class = "original-tweet"; 
					}
					tc.formatted_tweets.push(context);
				}
			}
		},

		sortTweets: function() {
			tc.all_tweets.sort(function(a, b) {
				var tweet_time_a = new Date(a.created_at);
				var tweet_time_b = new Date(b.created_at);
				return tweet_time_b - tweet_time_a;
			});
		},

		maybeRenderTweets: function() {
			tc.getMentionedUserTimelineReceived += 1;
			if (tc.getMentionedUserTimelineReceived >= tc.original_user_mentions.length) {
				tc.buildContext();
				$('.loading-layer, .loading-icon').hide();
				tc.applyProperTweets();
				jQuery("abbr.timeago").timeago();

			}
		},

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

	$(document).ready(function() {
		tc.init();
	});
})(jQuery, this);