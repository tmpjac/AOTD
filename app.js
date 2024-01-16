const express = require('express')
var bodyParser = require('body-parser')
const session = require('express-session');
const app = express()
const port = process.env.PORT || 3000

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.set('view engine', 'ejs');

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'SECRET' 
}));


/*  PASSPORT SETUP  */
const passport = require('passport');
var userProfile;

app.use(passport.initialize());
app.use(passport.session());

app.get('/success', (req, res) => res.send(userProfile));
app.get('/error', (req, res) => res.send("error logging in"));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});
//////////////////////////////

//TODO
/////////top bar Name left, login button right
/////////toggle button for daily only
/////////only show albums already listened/ if not logged in show all
/////////reload covers and progress on add/remove - easy if reload
/////////signout look good
//internet hosted json doc storage (with row only edit not entire document read/write)

//hosted nosql, sp.json will stay static. listens.json and aotd.json will be somewhere else
  //listens.json toggle and all
  //aotd.json all
//limit album size 50/60/70 percent?
//public domain, host somewhere?
//cool aoc style animattions after clicking add




var fs = require('fs');
// var obj = JSON.parse(fs.readFileSync('data/top100.json', 'utf8'));
var obj = JSON.parse(fs.readFileSync('data/sp.json', 'utf8'));


/* MONGO */
const MongoClient = require('mongodb').MongoClient
connectionString = "mongodb+srv://jake1:install4@cluster0.djq8r.mongodb.net/?retryWrites=true&w=majority"

MongoClient.connect(connectionString, { useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to Database')
    const db = client.db('albums')

app.get('/all', async (req, res) => {

    albums = []
    for (var i=0; i<obj.length; i++){
        albums.push( obj[i] );
    }

    var listens = [];
    if (req.isAuthenticated()){


        var email = req.user.emails[0].value;
        var nowDate = new Date(); 
        var today = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate(); 

        var dailyCollection = db.collection('aotd');
        var aotd_user = await dailyCollection.findOne({'email':email})
        // var aotd_user = await dailyCollection.findOne({'email':'asdfasdf'})

        var aotd = '';
        if (aotd_user === null){
          aotd_user = {'email':email, 'days':{}, 'listens':[]}
        }

        if (!aotd_user['days'].hasOwnProperty(today)){
          var items = albums.map((a) => a.rs_rank).filter((r) => !(listens.includes(r.toString())))//whats in albums - whats in listens
          var item = items[Math.floor(Math.random()*items.length)];
          aotd_user['days'][today] = item
          dailyCollection.updateOne({'email':email}, {$set: aotd_user}, {upsert:true} ).then(result => {console.log("result");console.log(result)})
        }

        res.render('index', {
          userProfile: userProfile,
          isLoggedIn: req.isAuthenticated(),
          listens: aotd_user['listens'],
          albums: albums,
          aotd: albums[aotd_user['days'][today]]
      });
    }else{ //noauth
      res.render('index', {
        userProfile: userProfile,
        isLoggedIn: false,
        listens: [],
        albums: albums,
        aotd: null
    });
    }


})


app.post("/toggle", async (req, res) => {
  var rank= parseInt(req.body.rank);

  var email = req.user.emails[0].value
  var dailyCollection = db.collection('aotd');
  var aotd_user = await dailyCollection.findOne({'email':email})
  // user will always have an entry b/c shared with loading the page?
  lsn = aotd_user['listens']
  if (lsn.indexOf(rank) !== -1){
    lsn.splice(lsn.indexOf(rank),1)
  }else{
    lsn.push(rank)
  }
  dailyCollection.updateOne({'email':email}, {$set: aotd_user}, {upsert:true} ).then(result => {console.log("result");console.log(result)})
  res.send(lsn[email])
});



/*  Google AUTH  */
 
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '142049106062-us1s1969aoqap0h6v7a4ihrhku4k5tpa.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile=profile;
      return done(null, userProfile);
  }
));
 
app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect success.
    res.redirect('/all');
  });

app.get('/signout', function (req, res){
  req.session.destroy(function (err) {
    res.redirect('/all'); //Inside a callback… bulletproof!
  });
});

})
.catch(error => console.error(error))
    

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})