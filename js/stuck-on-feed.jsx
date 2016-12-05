var StuckOnFeed = React.createClass({

  getInitialState: function() {
    var self = this;
    // Get the Appbase credentials from the config file
    // Note that this will be executed as async process
    $.getJSON("./config.json", function(json) {
      // Create Appbase reference object
      self.appbaseRef = new Appbase({
        url: 'https://scalr.api.appbase.io',
        appname: json.appbase.appname,
        username: json.appbase.username,
        password: json.appbase.password
      });
      self.type = json.appbase.type;
      self.pageNumber = 0;
      self.feedQuery = {
        query: {
          match_all: {}
        },
        sort: {
          timestamp: "desc"
        }
      };
      self.getHistoricalFeed();
      self.subscribeToUpdates();
    });
    return { items: [] };
  },

  // Fetch the existing status updates from Appbase based on pageNumber
  getHistoricalFeed: function() {
    self = this;
    self.appbaseRef.search({
      type: self.type,
      size: 10,
      from: self.pageNumber * 10,
      body: self.feedQuery
    }).on('data', function(res) {
      self.pageNumber = self.pageNumber + 1;
      console.log(res);
      self.addItemsToFeed(res.hits.hits);
    }).on('error', function(err) {
      console.log("search error: ", err);
    });
  },

  getMatchedFeed: function(e) {
    self = this;
    self.appbaseRef.search({
      type: self.type,
      body: {
        query: {
          match: {
            status: {
              "query" : e.target.value,
              "operator" : "or",
              "zero_terms_query": "all",
              "fuzziness": "AUTO"
            }
          }
        },
        sort: {
          timestamp: "desc"
        }
      }
    }).on('data', function(res) {
      console.log(res);
      self.setItemsToFeed(res.hits.hits);
    }).on('error', function(err) {
      console.log("search error: ", err);
    });
  },

  setItemsToFeed: function(newItems) {
    var updated = [];
    $.map(newItems, function(object) {
      updated.push(object._source);
    });
    this.setState({ items: updated });
  },

  // Add the items to the feed (in desc order)
  addItemsToFeed: function(newItems) {
    var updated = this.state.items;
    $.map(newItems, function(object) {
      updated.push(object._source);
    });
    this.setState({ items: updated });
  },

  subscribeToUpdates: function() {
    self = this;
    self.appbaseRef.searchStream({
      type: self.type,
      body: self.feedQuery
    }).on('data', function(res) {
      self.addItemToTop(res._source);
    }).on('error', function(err) {
      console.log("streaming error: ", err)
    });
  },

  addItemToTop: function(newItem) {
    var updated = this.state.items;
    updated.unshift(newItem);
    this.setState({ items: updated });
  },

  handleScroll: function(event) {
    var body = event.srcElement.body;
    // When the client reaches at the bottom of the page, get next page
    if (body.clientHeight + body.scrollTop >= body.offsetHeight) {
        this.getHistoricalFeed();
    };
  },

  componentWillMount: function() {
      window.addEventListener('scroll', this.handleScroll);
  },

  componentWillUnmount: function() {
      window.removeEventListener('scroll', this.handleScroll);
  },

  render: function() {
    return (
      <div>
        <div className="statusInput">
          <input type="text"
                 placeholder="search string"
                 onChange={this.getMatchedFeed} />
        </div>
        <FeedContainer items={this.state.items} />
      </div>
    );
  }

});


var FeedContainer = React.createClass({

  render: function() {
    var content;
    // Loop through all the items
    if (this.props.items.length > 0) {
      content = this.props.items.map(function(item, i) {
        return <FeedItem item={item} key={i}/>;
      });
    }
    else {
      content = <FeedItem item="No content Available!" />
    };
    return (
      <div className="row">
        <h3 className="col s12 center white-text">Status Feed</h3>
        {content}
      </div>
    );
  }

});


var FeedItem = React.createClass({

  render: function() {
    // Get the profile picture from Twitter using the given handle
    var twitterProfilePictureURL = "https://twitter.com/"
      + this.props.item.twitterHandle
      + "/profile_image?size=original";
    return (
      <div className="row">
        <div className="col s4 m2 l1">
          <img className="profile-picture" src={twitterProfilePictureURL}/>
        </div>
        <div className="col s8 m10 l11">
          <span className="twitter-handle">
            {this.props.item.twitterHandle} is stuck on
          </span>
          <p className="stuck-on-feed">
            {this.props.item.status}
          </p>
        </div>
      </div>
    );
  }

});


ReactDOM.render(
  <StuckOnFeed />,
  document.getElementById('stuckOnFeed')
);