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
  feeds: [{ type: ObjectId, ref: 'FeedSchema' }],
  subscriptions: [{ type: ObjectId, ref: 'FeedSchema' }]
});
FeedSchema = Schema({
  name: String, // name of feed
  owner: { type: ObjectId, ref: 'UserSchema' }, // owner for feed
  tasks: { type: ObjectId, ref: 'TaskSchema' },
  subscribers: [{ type: ObjectId, ref: 'UserSchema' }]
});
TaskSchema = Schema({
  name: String,
  notes: String,
  due_date: Date,
  feed: { type : ObjectId, ref: 'FeedSchema' }
});

var User = mongoose.model('User', UserSchema),
    Feed = mongoose.model('Feed', FeedSchema),
    Task = mongoose.model('Task', TaskSchema),
    db = mongoose.connection;

/* Connect to database */
mongoose.connect('mongodb://localhost/test');

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
    tasks : []
  });
  feed.save(function withSavedFeed(error, saved_feed) {
    if (error) {
      response.send({
        success: false,
        error: error
      });
    } else {
      user.update({$push: {feeds: saved_feed.id}}, function(error, num_affected, raw_response) {
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

      feed.update({$push: {tasks: saved_task.id}}, function(error, num_affected, raw_response) {
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
      console.log('token is', access_token);
      asana.setResourceOwner(access_token);
      asana.getUserMe(null, function(error, me) {
        if (error) {
          console.log(error);
          response.send('yo whattup homy we gots problem '+error);
        } else {
          var user = new User({
            name: me.data.name,
            access_token: access_token,
            feeds: [],
            subscriptions: []
          });
          user.save(withSavedUser);
        }

        function withSavedUser(error, saved_user) {
          if (error) {
            response.send({
              success: false,
              error: error
            });
          } else {
            request.session.user = saved_user;
            response.redirect('/');
          }
        }
      });
    }
  }
});

app.listen(port, function() {
    console.log("Listening on " + port);
});

