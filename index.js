var mongo = require('mongodb');
var collections = {};

module.exports = function createRedisStoreForMemoJS(previousStore, opts) {
  function getCollection(options, dontRecurse, done) {
    options = options || {};
    if (options.collection) return done(null, options.collection);
    if (options.mongoUrl) {
      if (collections[options.mongoUrl]) return done(null, collections[options.mongoUrl]);
      return mongodb.MongoClient.connect(options.mongoUrl, function (err, db) {
        if (err) return done(err);
        collections[options.mongoUrl] = db.collection(options.collectionName || 'memojs');
        return done(null, collections[options.mongoUrl]);
      });
    }
    if (!dontRecurse) return getCollection(opts, true, done);
    return done('No MongoDB info specified');
  }

  function getKey(options, key, done) {
    getCollection(options, false, function (err, collection) {
      if (err) return done(err);
      collection.findOne({_id: key, expires: {$gt: Date.now()}}, function (err, doc) {
        if (err) return done(err);
        if (!doc) return done('Not Found');
        return done(null, options.deserialize(doc.value), {value: doc.value, expires: doc.expires});
      });
    });
  }

  function setKey(options, key, entry, done) {
    var value = entry && options.serialize(entry.value);
    var expires =  entry && entry.expires || ( Date.now() + 365 * 24 * 3600 * 1000 );

    getCollection(options, false, function (err, collection) {
      if (err) return done(err);
      if (!entry || value === undefined || value === null) {
        return collection.remove({_id: key}, function (err) { return done(err); });
      }
      
      collection.findAndModify(
        {_id: key}, 
        {_id: -1}, 
        {$setOnInsert: {value: value, expires: expires}}, 
        {new: true, upsert: true}, 
        function (err, doc) { 
          if (err) return done(err);
          return done(null, value, {value: value, expires: entry.expires}); 
        }
      );
    });
    return entry && {value: value, expires: expires};
  }

  function setter(key, options, value) {
    if (value === undefined || options.maxAge === 0) {
      setKey(options, key);
      return;
    }
    var expires = (options.maxAge < 0) ? 0 : (new Date().getTime() + options.maxAge * 1000);
    var entry = {expires: expires, value: value};
    return setKey(options, key, entry);
  }

  function chainedSetter(key, options, value) {
    if (previousStore) previousStore.set(key, options, value);
    return setter(key, options, value);
  }

  function getter(key, options, done) {
    getKey(options, key, function (err, val, entry) {
      if (err) return done('Not Found');
      return done(null, val, entry);
    });
  }

  function chainedGetter(key, options, done) {
    getter(key, options, function (err, val, ret) {
      if (!err || !previousStore) return done(err, val, ret);
      return previousStore.get(key, options, onReadThrough);
    });

    function onReadThrough(err, value, entry) {
      if (err) return done(err, value, entry);
      var now = new Date().getTime();
      if (entry && entry.expires < now) return done(err, value, entry);
      
      var newOptions = Object.create(options);
      newOptions.maxAge = Math.floor((entry.expires - now) / 1000);
      return done(err, value, setter(key, newOptions, value));
    }
  }

  return {set: chainedSetter, get: chainedGetter};
}
