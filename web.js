// ENV should have ASANA_CLIENT_ID, ASANA_CLIENT_SECRET, BEST_SECRET_EVER
var express = require('express'),
    asana = require('asana_api'),
    ejs = require('ejs'),
    fs = require('fs'),

    app = express(),
    mongoose = require('mongoose'),
    port = process.env.PORT || 8089,
    hostname = process.env.HOSTNAME + ':' + port,
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
  feeds: [{ type: ObjectId, ref: 'Feed' }],
  subscriptions: [{ type: ObjectId, ref: 'Feed' }]
});
FeedSchema = Schema({
  name: String, // name of feed
  owner: { type: ObjectId, ref: 'User' }, // owner for feed
  tasks: [{ type: ObjectId, ref: 'Task' }],
  subscribers: [{ type: ObjectId, ref: 'User' }]
});
TaskSchema = Schema({
  name: String,
  notes: String,
  due_date: Date,
  feed: { type : ObjectId, ref: 'Feed' }
});

var User = mongoose.model('User', UserSchema),
    Feed = mongoose.model('Feed', FeedSchema),
    Task = mongoose.model('Task', TaskSchema),
    db = mongoose.connection;

/* Connect to database */
mongoose.connect('mongodb://localhost/feedasana');

app.get('/', function(request, response) {
  var user = request.session.user;
  if (typeof user !== 'undefined') {
    response.send(ejs.render(fs.readFileSync(__dirname + '/views/index.html', 'utf8'), {penis:'hi'}));
  } else {
    // TODO: give middle page thingy
    response.redirect(authorization_uri);
  }
});

app.post('/feeds', function(request, response) {
  var user = request.session.user;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  var feed = new Feed({
    name: request.body.name,
    owner: user.id,
    tasks : [],
    subscribers : []
  });
  feed.save(function withSavedFeed(error, saved_feed) {
    if (error) {
      response.send({
        success: false,
        error: error
      });
    } else {
      console.log(user);
      User.update({_id: user._id}, {$push: {feeds: saved_feed.id}}, function(err, num_affected, raw_response) {
        if (err) return res.send('error adding feed to user ' + err);
        console.log('added feed to user');
        response.send({
          success: true,
          feed: saved_feed
        });
      });
    }
  });
});

app.post('/subscriptions', function(request, response) {
  var user = request.session.user;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  Feed.fineOne({ _id: request.body.feed_name }).exec(function(error, feed) {
    Feed.update({_id: request.body.feed._id}, {$push: {subscribers: user._id}}, function(err, num, resp) {
      if (err) return res.send('error subscribing user to feed: ' + err);
      console.log('Feed ' + feed.name + ' got new subscriber ' + user.name);
      response.send({ success: true });
    });
    User.update({_id: user._id}, {$push: {subscriptions: feed._id}}, function(err, num, resp) {
      if (err) return res.send('error subscribing user to feed: ' + err);
      console.log('User ' + user.name + ' subscribed to feed ' + request.body.feed.name);
      response.send({ success: true });
    });
  });
});

app.post('/tasks', function(request, response) {
  var user = request.session.user;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  Feed.findOne({ _id: request.body.feed_id }).populate('owner').exec(function(error, feed) {
    console.log('feed = ' + feed);
    if (typeof feed === 'undefined' || feed.owner !== user.id) {
      return response.send({
        success: false,
        error: 'can\'t find this feed: ' + error
      });
    }

    var task = new Task({
      name: request.body.name,
      notes: request.body.notes,
      due_date: new Date(request.body.due_date),
      feed: request.body.feed_id
    });
    task.save(function(error, saved_task) {
      if (error) return response.send({ success: false, error: 'can\'t save task: ' + error });

      Feed.update({_id: feed._id}, {$push: {tasks: saved_task.id}}, function(error, num_affected, raw_response) {
        if (err) return res.send('error adding feed to user ' + err);
        console.log('added feed to user');
        response.send({
          success: true,
          task: saved_task
        });
      });
    });
  });
  asana.setResourceOwner(user.access_token);
});

app.get('/feeds', function(request, response) {
  var user = request.session.user;
  if (typeof user === 'undefined') {
    return response.send({success:false});
  }
  User
  .findOne({name: user.name})
  .populate('feeds subscriptions')
  .exec(function(error, user_info) {
    response.send({
      success: true,
      feeds: user_info.feeds,
      subscriptions: user_info.subscriptions
    });
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
          User.findOne({name: me.data.name}, saveNewUser);
        }

        function withSavedUser(error, saved_user) {
          if (error) {
            response.send({
              success: false,
              error: error
            });
          } else {
            request.session.user = saved_user;
            console.log("Saving user: " + saved_user);
            response.redirect('/');
          }
        }

        function saveNewUser(error, user) {
          if (error) {
            response.send({success: false, error: error})
          } else if (user === null) {
            var user = new User({
              name: me.data.name,
              access_token: access_token,
              feeds: [],
              subscriptions: []
            });
            console.log("User: " + user);
            user.save(withSavedUser);
          } else {
            withSavedUser(null, user);
          }
        }
      });
    }
  }
});

app.listen(port, function() {
    console.log("Listening on " + port);
});

