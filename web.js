// ENV should have ASANA_CLIENT_ID, ASANA_CLIENT_SECRET, BEST_SECRET_EVER
var express = require('express'),
    asana = require('asana_api'),
    ejs = require('ejs'),
    fs = require('fs'),

    app = express(),
    mongoose = require('mongoose'),
    port = process.env.PORT || 8080,
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
    }),
    index_str = fs.readFileSync(__dirname + '/views/index.html', 'utf8');

app.use(express.logger());
app.use(express.cookieParser());
app.use(express.session({secret: process.env.BEST_SECRET_EVER}));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/assets'));

/** Define feed model for database */
feedSchema = mongoose.Schema({
  name: String, // name of feed
  owner: String, // owner for feed
  tasks: [{shortDesc : String, fullDesc : String, date : Date}] // pending tasks
});
var Feed = mongoose.model('Feed', feedSchema);

/* Connect to database */
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;

app.get('/', function(request, response) {
  var access_token = request.session.access_token;
  if (typeof access_token !== 'undefined') {
    asana.setResourceOwner(access_token);
    asana.getUserMe(null, function(error, me) {
      if (error) {
        console.log(error);
        response.send('yo whattup homy we gots problem '+error);
      } else {
        response.send(ejs.render(index_str, {penis:'hi'}));
          // 'yo whattup homy' + me.data.name);
      }
    });
  } else {
    // give middle page thingy
    response.redirect(authorization_uri);
  }
});

app.post('/feeds', function(request, response) {
  var access_token = request.session.access_token;
  if (typeof access_token === 'undefined') {
    return response.send({success:false});
  }
  asana.setResourceOwner(access_token);
  asana.getUserMe(null, withMe);

  function withMe(error, me) {
    if (error) {
      response.send({
        success: false,
        error: error // "error getting me from asana"
      });
    } else {
      var feed = new Feed({
        name: request.body.name,
        owner: request.body.owner,
        tasks : []
      });
      feed.save(withSavedFeed);
    }
  }

  function withSavedFeed(error, saved_feed) {
    if (error) {
      response.send({
        success: false,
        error: error
      });
    } else {
      response.send({
        success: true,
        feed: saved_feed
      });
    }
  }
});

app.get('/callback', function(request, response) {
  var code = request.query.code;
  OAuth2.AuthCode.getToken({
    code: code,
    redirect_uri: callback_uri
  }, saveToken);

  function saveToken(error, result) {
    if (error) {
      console.log('Access Token Error', error.message);
      response.send('bad problem yo');
    } else {
      var token = OAuth2.AccessToken.create(result);
      request.session.access_token = token;
      console.log('token is', token);
      response.redirect('/');
    }
  }
});

app.listen(port, function() {
    console.log("Listening on " + port);
});

