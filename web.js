// ENV should have ASANA_CLIENT_ID, ASANA_CLIENT_SECRET, BEST_SECRET_EVER, HOSTNAME
var express = require('express'),
    asana = require('asana_api'),
    ejs = require('ejs'),
    fs = require('fs'),

    app = express(),
    mongoose = require('mongoose'),
    port = process.env.PORT || 8089,
    hostname = process.env.HOSTNAME + (process.env.PORT ? '' : ':' + port),
    callback_uri = hostname + '/callback',
    OAuth2 = require('simple-oauth2')({
      clientID: process.env.ASANA_CLIENT_ID,
      clientSecret: process.env.ASANA_CLIENT_SECRET,
      authorizationPath: '/-/oauth_authorize',
      tokenPath: '/-/oauth_token',
      site: 'https://app.asana.com'
    }),
    authorization_uri = OAuth2.AuthCode.authorizeURL({
      redirect_uri: callback_uri
    });

app.use(express.logger());
app.use(express.cookieParser());
app.use(express.session({secret: process.env.BEST_SECRET_EVER}));
app.use(express.bodyParser());
app.use(express['static'](__dirname + '/assets'));

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

UserSchema = new Schema({
  name: String,
  access_token: Object,
  workspace: Object,
  feeds: [{ type: ObjectId, ref: 'Feed' }],
  subscriptions: [{ type: ObjectId, ref: 'Subscription' }]
});
FeedSchema = Schema({
  name: String, // name of feed
  owner: { type: ObjectId, ref: 'User' }, // owner for feed
  tasks: [{ type: ObjectId, ref: 'Task' }]
});
SubscriptionSchema = Schema({
  feed: { type: ObjectId, ref: 'Feed' },
  workspace: Object,
  user: { type: ObjectId, ref: 'User' }
});
TaskSchema = Schema({
  name: String,
  notes: String,
  asana_task_id: String,
  due_date: Date,
  feed: { type : ObjectId, ref: 'Feed' }
});

var User = mongoose.model('User', UserSchema),
    Feed = mongoose.model('Feed', FeedSchema),
    Task = mongoose.model('Task', TaskSchema),
    Subscription = mongoose.model('Subscription', SubscriptionSchema);

var async = require('async');

/* Connect to database */
mongoose.connect(process.env.MONGOHQ_URL);

app.get('/', function(request, response) {
  var user = request.session.user_info;
  if (typeof user !== 'undefined') {
    response.send(ejs.render(fs.readFileSync(__dirname + '/views/index.html', 'utf8'), {}));
  } else {
    // TODO: give middle page thingy
    response.redirect(authorization_uri);
  }
});

app.post('/feeds', function(request, response) {
  var user = request.session.user_info;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  Feed.findOne({ name: request.body.name }, function(error, feed_info) {
    if (feed_info === null) {
      Feed.create({
        name: request.body.name,
        owner: user._id,
        tasks : []
      }, function withSavedFeed(error, saved_feed) {
        if (error) {
          response.send({
            success: false,
            error: error
          });
        } else {
          User.update({_id: user._id}, {$push: {feeds: saved_feed.id}}, function(err, num_affected, raw_response) {
            if (err) return response.send('error adding feed to user ' + err);
            console.log('added feed to user');
            response.send({
              success: true,
              feed: saved_feed
            });
          });
        }
      });
    } else {
      console.log("did find feed_info");
    }
  });
});

/*
app.post('/endFeed', function(request, response) {
  var user = request.session.user_info;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  Feed.findOne({ name: request.body.name }).populate("subscribers").exec(
    function(error, feed) {
      if (feed === null) {
        return;
      }
      for (var user in feed.subscribers) {
        var ind = user.subscriptions.indexOf(user._id);
        user.splice(ind, 1);
        user.save(null);
      }
      feed.remove(null);
    });
});
*/

function errF(error, response) {
  return response.send({success: false, error: error});
}

app.post('/subscriptions', function(request, response) {
  var user = request.session.user_info;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  // request.body.workspace = {
  //   id: 234,
  //   name: "asdfkj"
  // };
  console.log(request.body);
  console.log(request.body.name);
  console.log(request.body.workspace);
  Feed.findOne({ name: request.body.name }).exec(function(error, feed) {
    if (error || feed === null)
      return response.send({success:false});
    // TODO: check if this is already in user's subscriptions
    console.log('Feed: ' + feed);
    console.log('User ' + user);
    console.log('User id ' + user._id);
    Subscription.create({
      feed: feed._id,
      workspace: {
        id: request.body.workspace.id,
        name: request.body.workspace.name
      },
      user: user._id
    }, function(error, subscription_info) {
      if (error) return response.send('error creating subscription: ' + error);
      User.findByIdAndUpdate(user._id, {$push: {subscriptions: subscription_info._id}}, function(err, num, resp) {
        if (err) return response.send('error subscribing user to feed: ' + err);
        console.log('User ' + user.name + ' subscribed to feed ' + request.body.name);
        response.send({ success: true });
      });
      // for (var task in Task.find({ feed: feed._id, due_date: { $lt: new Date().getDate() } })) {
      //   User.update();
      //   // TODO: add these to asana
      // }
    });
  });
});

/*
app.post('/unsubscribe', function(request, response) {
  var user = request.session.user_info;
  console.log(request.body.name);
  if (typeof user === 'undefined') {
    return response.send({success: false});
  }
  Feed.findOne({ name: request.body.name }).exec(function(error, feed) {
    if (error || feed === null) return response.send({success:false});
    var userInd = feed.subscribers.indexOf(user._id);
    var feedInd = user.subscriptions.indexOf(feed._id);
    if (userInd < feed.subscribers.length) {
      feed.subscribers.splice(userInd, 1);
      feed.save(null);
      User.findById(user._id, function(error, user) {
        console.log("no more sub");
        user.subscriptions.splice(feedInd, 1);
        user.save(null);
        response.send({ success: true });
      });
    } else {
      response.send({ success: false });
    }
  });
});
*/

app.post('/tasks', function(request, response) {
  var user = request.session.user_info;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  Feed.findById(request.body.feed_id).populate('owner').exec(function(error, feed) {
    console.log('feed = ' + feed);
    console.log('user = ' + JSON.stringify(user, null, 4)+', type='+typeof user);
    console.log('feed owner._id = ' + feed.owner._id+', type='+typeof feed.owner._id);
    console.log('feed owner.id = ' + feed.owner.id+', type='+typeof feed.owner.id);
    console.log('user.id = ' + user.id+', type='+typeof user.id);
    console.log('user._id = ' + user._id+', type='+typeof user._id);
    if (typeof feed === 'undefined' || feed.owner.id !== user._id) {
      return response.send({
        success: false,
        error: 'can\'t find this feed: ' + error
      });
    }

    Task.create({
      name: request.body.name,
      notes: request.body.notes,
      due_date: new Date(request.body.due_date),
      feed: request.body.feed_id
    }, function(error, saved_task) {
      if (error) return response.send({ success: false, error: 'can\'t save task: ' + error });

      Feed.findByIdAndUpdate(feed._id, {$push: {tasks: saved_task._id}}, function(err, num_affected, raw_response) {
        if (err) return res.send('error adding feed to user ' + err);
        console.log('added feed to user');
        addTaskToFeedSubscribers(saved_task, feed, response);
      });
    });
  });
});

function range(n) {
  var list = [];
  for (var i = 0; i < n; i++) {
    list.push(i);
  }
  return list;
}

app.get('/feeds', function(request, response) {
  var user = request.session.user_info;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  console.log('get /feeds');
  User
  .findOne({name: user.name})
  .populate('subscriptions feeds')
  .exec(function(error, user_info) {
    console.log('number of feeds: '+user_info.feeds.length);
    console.log('number of subscriptions: '+user_info.subscriptions.length);
    async.map(range(user_info.feeds.length), function(i, callback) {
      var feed_info = user_info.feeds[i];
      Feed.findById(feed_info._id, function(error, feed) {
        console.log("Feed: " + feed);
        feed.populate('tasks', function(error, populated) {
          callback(error, populated);
        });
      });
    }, function finish(error, populatedFeeds) {
      console.log('first finish');
      async.map(range(user_info.subscriptions.length), function(i, callback) {
        var subscription_info = user_info.subscriptions[i];
        console.log("subscription_info: " + subscription_info);
        Subscription.findById(subscription_info._id, function(error, subscription) {
          console.log("Subscription: " + subscription);
          subscription.populate('feed', function(error, populatedSubscription) {
            if (error) return callback(error, populatedSubscription);
            populatedSubscription.feed.populate('tasks', function(error, populatedFeed) {
              populatedSubscription.feed = populatedFeed;
              callback(error, populatedSubscription);
            });
          });
        });
      }, function finish(error, populatedSubscriptions) {
        console.log('second finish');
        var subscriptionFeeds = populatedSubscriptions.map(function(subscription) {
          return subscription.feed;
        });
        asana.setResourceOwner(user.access_token);
        asana.getProjects({}, function(err, data) {
          if (err) return response.send('error getting projects: '+err);
          response.send({
            success: true,
            feeds: populatedFeeds,
            subscriptions: subscriptionFeeds,
            workspaces: data.data
          });
          console.log("\n\nSENT RESPONSE: " + response + "\n\n");
        });
      });
    });
  });
});

function addTaskToFeedSubscribers(task_info, feed, response) {
  Feed.findById(feed._id).populate('subscribers').exec(function(err, feed) {
    if (err || feed === null) {
      response.send('can\'t find feed error: ' + err);
    }
    console.log('in findOne, feed is: ');
    console.log(feed);
    console.log('in findOne, subscribers are: ');
    Subscription.find({feed: feed._id}).populate('user').exec(function(error, subscriptions) {
      if (error) response.send('error getting subscriptions: '+error);
      console.log('subscriptions');
      console.log(subscriptions);
      var errors = [];
      subscriptions.forEach(function(subscription_info) {
        var subscriber = subscription_info.user;
        console.log(subscription_info);
        console.log(subscription_info.id);
        console.log(subscription_info._id);
        console.log('subscribing a subscriber ' + subscriber);
        var task = {
          name: task_info.name,
          notes: task_info.notes,
          assignee: 'me',
          workspace: (subscription_info.workspace && subscription_info.workspace._id) || subscriber.workspace._id,
          due_on: task_info.due_date
        };
        asana.setResourceOwner(subscriber.access_token);
        asana.createTask(task, function(err, data) {
          if (err) errors.push([subscriber.name, err]);
          else {
            console.log('subscriber subscribed:');
            console.log(data);
          }
        });
      });
      if (errors.length > 0) {
        response.send('errors occurred: ' + errors);
      } else {
        response.send({
          success: true,
          task: task_info
        });
      }
    });
  });
}

app.get('/taskCompletion', function(request, response) {
  var total = 0;
  var completed = 0;
  Feed.findOne({name: request.feed_name}, function(error, feed) {
    Task.find({name: request.task_name}, function(error, tasks) {
      for (var task in tasks) {
        asana.getTask(task.asana_task_id, withAsanaTask);
      }
      while (total < tasks.length) { } //__HACK__athon
      finish();
    });
  });

  function withAsanaTask(error, task) {
    if (error) response.send({success: false});
    if (task.completed) {
      completed++;
    }
    total++;
  }
  function finish() {
    response.send({
      success: true,
      total: total,
      completed: completed
    });
  }
});

app.get('/search', function(request, response) {
  var patt = request.body.pattern;
  patt = patt || request.query.pattern;
  if (patt === null || typeof patt === 'undefined') {
    response.send({success: false});
    return;
  }
  console.log("Pattern: " + patt);
  var matches = [];
  Feed.find({}, function(error, feeds) {
    for (var i = 0; i < feeds.length; i++) {
      try {
        matches.push(feeds[i].name);
      } catch (e) {
        response.send({success: false});
      }
    }
    response.send({success: true, matches: matches});
    function chill(error, e) { }
  });
});

app.get('/callback', function(request, response) {
  var code = request.query.code;
  OAuth2.AuthCode.getToken({
    code: code,
    redirect_uri: callback_uri
  }, withToken);

  function withToken(error, token_result) {
    if (error) {
      console.log('Access Token Error', error.message);
      response.send('bad problem yo');
    } else {
      var access_token = OAuth2.AccessToken.create(token_result);
      asana.setResourceOwner(access_token);
      asana.getUserMe(null, function(error, me) {
        if (error) {
          console.log(error);
          response.send('yo whattup homy we gots problem '+error);
        } else {
          var asana_id_path = 'access_token.token.data.id',
              query = {};
          query[asana_id_path] = me.data.id;
          User.findOne(query, saveNewUser);
        }

        function withSavedUser(error, saved_user) {
          if (error) {
            response.send({
              success: false,
              error: error
            });
          } else {
            request.session.user_info = saved_user;
            console.log("Saving user: " + saved_user);
            response.redirect('/');
          }
        }

        function saveNewUser(error, user_info) {
          if (error) {
            response.send({success: false, error: error});
          } else if (user_info === null) {
            console.log("me: ");
            console.log(me);
            console.log('me.data.workspaces[0]');
            console.log(me.data.workspaces[0]);
            var user = new User({
              name: me.data.name,
              access_token: access_token,
              workspace: me.data.workspaces[0],
              feeds: [],
              subscriptions: []
            });
            console.log("User: " + user);
            user.save(withSavedUser);
          } else {
            console.log('User already exists');
            User.findByIdAndUpdate(user_info._id, {
              name: user_info.name,
              access_token: access_token,
              workspace: user_info.workspace,
              feeds: user_info.feeds,
              subscriptions: user_info.subscriptions
            }, withSavedUser);
          }
        }
      });
    }
  }
});

app.listen(port, function() {
    console.log("Listening on " + port);
});

