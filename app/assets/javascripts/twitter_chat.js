window.twitter_chat = {

	tweets_in_conversation: [],
	original_user_mentions: [],
	original_screen_name: null,
	original_tweet_time: null,
	formatted_tweets: [],
	click_counter: 0,
	previously_formatted_tweets: [],
	$no_convo_message: $('<li class="tweet error-message"><p>No conversation exists for this tweet</p></li>'),
	$error_message: $('<li class="tweet error-message"><p>An error has occurred</p></li>'),

	init: function() {
		this.bindEvents();
	},

	bindEvents: function() {
		$('#container').on('click', '#search-button', function() {
			twitter_chat.click_counter++;
			$('.loading-layer, .loading-icon').show();
			var raw_search = $('#search-query').val();
			var formatted_search_info = twitter_chat.formatQuery(raw_search, '/');
			var formatted_tweet_id = formatted_search_info.tweet_id;
			var formatted_screen_name = formatted_search_info.screen_name;

			twitter_chat.previously_formatted_tweets = twitter_chat.formatted_tweets;
			twitter_chat.resetProperties();
			twitter_chat.original_screen_name = formatted_screen_name;
			twitter_chat.getRequestedTweet(formatted_tweet_id);
			twitter_chat.getOriginalAuthorTimeline(formatted_screen_name, formatted_tweet_id);
		});
	},

	formatQuery: function(string_to_split, separator) {
		var array_of_split_string = string_to_split.split(separator);
		var screen_name = array_of_split_string[array_of_split_string.length - 3];
		var tweet_id = array_of_split_string[array_of_split_string.length - 1];
		return {
			'screen_name': screen_name,
			'tweet_id': tweet_id
		}
	},

	resetProperties: function() {
		twitter_chat.getMentionedUserTimelineReceived = 0;
		twitter_chat.tweets_in_conversation = [];
		twitter_chat.formatted_tweets = [];
		// $('.tweet-list').children().remove();
	},

	getRequestedTweet: function(formatted_tweet_id) {
		$.ajax({
			url: "https://api.twitter.com/1/statuses/show.json?id=" + formatted_tweet_id + "&include_entities=true",
			success: function(response) {
				twitter_chat.original_tweet_time = (new Date(response.created_at)).valueOf();
				var user_mentions = response.entities.user_mentions.length;
				if (user_mentions) {
					for (var i = 0; i < user_mentions; i++) {
						twitter_chat.original_user_mentions.push(response.entities.user_mentions[i].screen_name);
					}
				} else if (user_mentions === 0) {
					twitter_chat.tweets_in_conversation.push(response);
					twitter_chat.maybeRenderTweets();
					twitter_chat.$no_convo_message.appendTo('.tweet-list');
				}
				twitter_chat.getMentionedUserTimeline(twitter_chat.original_user_mentions);
			},
			timeout: 10000,
			error: function() {
				$('.loading-layer, .loading-icon').hide();
				twitter_chat.$error_message.appendTo('.tweet-list');
			},
			dataType: "jsonp"
		})
	},

	getOriginalAuthorTimeline: function(formatted_screen_name, formatted_tweet_id) {
		$.ajax({
			url: "https://api.twitter.com/1/statuses/user_timeline.json?include_entities=true&screen_name=" + formatted_screen_name + "&max_id=" + formatted_tweet_id + "&count=200",
			success: twitter_chat.filterOriginalAuthorTimeline,
			dataType: "jsonp"
		});

		$.ajax({
			url: "https://api.twitter.com/1/statuses/user_timeline.json?include_entities=true&screen_name=" + formatted_screen_name + "&since_id=" + formatted_tweet_id + "&count=200",
			success: twitter_chat.filterOriginalAuthorTimeline,
			dataType: "jsonp"
		})
	},

	filterOriginalAuthorTimeline: function(response) {
		var total_user_tweets = response.length;
		for (var i = 0; i < total_user_tweets; i++) {
			var this_tweet = response[i];
			var total_user_mentions = this_tweet.entities.user_mentions.length;
			for (var j = 0; j < total_user_mentions; j++) {
				if ((_.include(twitter_chat.original_user_mentions, this_tweet.entities.user_mentions[j].screen_name)) && (!_.detect(twitter_chat.tweets_in_conversation, function(t) { return t.id_str === this_tweet.id_str;}))) {
					twitter_chat.tweets_in_conversation.push(this_tweet);
				}
			}
		}
	},

	getMentionedUserTimeline: function() {
		var total_user_mentions = twitter_chat.original_user_mentions.length;
		for (var i = 0; i < total_user_mentions; i++) {
			$.ajax({
				url: "https://api.twitter.com/1/statuses/user_timeline.json?include_entities=true&screen_name=" + twitter_chat.original_user_mentions[i] + "&count=200",
				success: function(response) {
					twitter_chat.filterMentionedUserTimeline(response);
					twitter_chat.maybeRenderTweets();
				},
				dataType: "jsonp"
			})
		}
	},

	filterMentionedUserTimeline: function(response) {
		var total_user_tweets = response.length;
		for (var i = 0; i < total_user_tweets; i++) {
			var this_tweet = response[i];
			var total_user_mentions = this_tweet.entities.user_mentions.length;
			for (var j = 0; j < total_user_mentions; j++) {
				if ((this_tweet.entities.user_mentions[j].screen_name === twitter_chat.original_screen_name) && (!_.detect(twitter_chat.tweets_in_conversation, function(t) { return t.id_str === this_tweet.id_str;}))) {
					twitter_chat.tweets_in_conversation.push(this_tweet);
				}
			}
		}
	},

	buildContext: function() {
		twitter_chat.tweets_in_conversation.sort(function(a, b) {
			var tweet_time_a = new Date(a.created_at);
			var tweet_time_b = new Date(b.created_at);
			return tweet_time_b - tweet_time_a;
		});
		for (var i = 0; i < twitter_chat.tweets_in_conversation.length; i++) {
			// check if tweet time is within 1 day of original tweet time // 86,400,000ms/day
			if (Math.abs(twitter_chat.original_tweet_time - ((new Date(twitter_chat.tweets_in_conversation[i].created_at)).valueOf())) < 86400000 ) {
				var context = {
					id_str: twitter_chat.tweets_in_conversation[i].id_str,
					avatar: twitter_chat.tweets_in_conversation[i].user.profile_image_url,
					screen_name: twitter_chat.tweets_in_conversation[i].user.screen_name,
					real_name: twitter_chat.tweets_in_conversation[i].user.name,
					time: (new Date(twitter_chat.tweets_in_conversation[i].created_at)).toISOString(),
					tweet_body: (twitter_chat.tweets_in_conversation[i].text).replace(/@([a-z0-9_]+)/gi, '<a class="user-mention" href="http://twitter.com/$1" target="_blank">@$1</a>'),
					tweet_url: "https://twitter.com/#!/" + twitter_chat.tweets_in_conversation[i].user.screen_name + "/status/" + twitter_chat.tweets_in_conversation[i].id_str
				}
				if ((new Date(twitter_chat.tweets_in_conversation[i].created_at)).valueOf() === twitter_chat.original_tweet_time) {
					context.li_class = "original-tweet"; 
				}
				twitter_chat.formatted_tweets.push(context);
			}
		}
	},

	getMentionedUserTimelineReceived: 0,
	maybeRenderTweets: function() {
		twitter_chat.getMentionedUserTimelineReceived += 1;
		if (twitter_chat.getMentionedUserTimelineReceived >= twitter_chat.original_user_mentions.length) {
			twitter_chat.buildContext();
			$('.loading-layer, .loading-icon').hide();
			// on click, take formatted_tweets, set it equal to
			// previous_array_of_formatted_tweets, still reset
			// everything inside of resetProperties, then before
			// sending formatted_tweets through template engine,
			// check if formatted_tweets is longer than previous_array_of_formatted_tweets,
			// and if so, find which tweet isn't in there and only send that one through template engine
			// push that new tweet onto previously_formatted_tweets and then set formatted_tweets = previously_formatted_tweets

			var array_of_previous_tweet_ids = _.pluck(twitter_chat.previously_formatted_tweets, 'id_str');

			twitter_chat.new_live_tweets = _.reject(twitter_chat.formatted_tweets, function(tweet) {
				return _.include(array_of_previous_tweet_ids, tweet.id_str)
			});

			for (var i = 0; i < twitter_chat.new_live_tweets.length; i++) {
				twitter_chat.previously_formatted_tweets.push(twitter_chat.new_live_tweets[i]);
			}

			// if (new_tweets.length) {
			// 	$('.tweet-list').prepend(JST['pages/index']({'formatted_tweets': new_tweets}))
			// }

			// if (twitter_chat.formatted_tweets.length > twitter_chat.previously_formatted_tweets.length) {
			// 	twitter_chat.new_tweet = twitter_chat.formatted_tweets.diff(twitter_chat.previously_formatted_tweets);
			// 	twitter_chat.formatted_tweets = twitter_chat.new_tweet;
			// 	console.log(twitter_chat.new_tweet);
			// 	console.log(twitter_chat.formatted_tweets);
			// 	console.log(twitter_chat.previously_formatted_tweets);
			// }
				// after only the new tweets have been passed through engine, push new tweets onto previous ones
			// and set that whole new big array as formatted_tweets

			if (twitter_chat.click_counter === 1) {
				$('.tweet-list').append(JST['pages/index']({'formatted_tweets': twitter_chat.formatted_tweets}));
			} else if (twitter_chat.click_counter > 1) {
				$('.tweet-list').prepend(JST['pages/index']({'formatted_tweets': twitter_chat.new_live_tweets}))
			}

			twitter_chat.previously_formatted_tweets.push(twitter_chat.new_live_tweets);
			twitter_chat.formatted_tweets = twitter_chat.previously_formatted_tweets;

			// if (twitter_chat.formatted_tweets.length === 1) {
			// 	twitter_chat.$no_convo_message.appendTo('.tweet-list');
			// }
			jQuery("abbr.timeago").timeago();

		}
	}
}

// Array.prototype.diff = function(a) {
//     return this.filter(function(i) {return !(a.indexOf(i) > -1);});
// };

$(document).ready(function() {
	twitter_chat.init();
});