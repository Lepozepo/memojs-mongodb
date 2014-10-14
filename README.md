# memojs-mongo

This is a simple MongoDB plugin for the [memojs](https://github.com/like-falling-leaves/memojs) library.
[![NPM info](https://nodei.co/npm/memojs-mongodb.png?downloads=true)](https://npmjs.org/package/memojs-mongodb)


## Install

    npm install memojs
    npm install memojs-db


## Usage -- Own Mongo DB Collection

```javascript
   var mongo = require('mongodb');
   var memojs = require('memojs');
   var memojsMongo = require('memojs-mongodb');

   mongo.MongoClient.connect(url, function (err, db) {
     var collection = db.collection('mycollection');
     var store = memojsMongo({collection: collection});
     memojs.configure({store: store});
   });
}
```

## Usage -- MongoDB via url

```javascript
   var mongo = require('mongodb');
   var memojs = require('memojs');
   var memojsMongo = require('memojs-mongodb');
   var store = memojsMongo({mongoUrl: mongoUrl});
   memojs.configure({store: store});
}
```

## Usage -- specifying TTL for cache keys

Note that expired keys are not deleted -- but the values are not used for anything.  You can set TTL via maxAge property when configuring memojs.

```javascript
   memjos.configure({store: store, maxAge: 24 * 60 * 60};
}
```

