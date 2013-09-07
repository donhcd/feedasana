/**
 * The angular controller for feedasana.
 */
feedController = function($scope) {
  // Enum types.
  $scope.feedStates = {NEW: "Create", SUBSCRIBE: "Subscribe"}
  $scope.ownerType = {
    SUBSCRIBER: 0,OWNER: 1, BOTH: 2
  }

  // Get all subscriptions.
  $scope.allSubscriptions = {};
  var retrieveAll = function() {
    $.ajax('/feeds', {
      type: 'get',
    }).done(function(response) {
      if (response.success) {
        for (var i = 0; i < response.feeds.length; i++) {
          $scope.allSubscriptions[response.feeds[i]._id] = {
            ownerType : $scope.ownerType.OWNER,
            _id: response.feeds[i]._id,
            name: response.feeds[i].name,
            tasks: response.feeds[i].tasks
          }
        }
        for (var j = 0; j < response.subscriptions.length; j++) {
          var value = $scope.allSubscriptions[response.subscriptions[j]._id];
          if (value) {
            value.ownerType = $scope.ownerType.BOTH;
            continue;
          }
          $scope.allSubscriptions[response.subscriptions[j]._id] = {
            ownerType : $scope.ownerType.SUBSCRIBER,
            _id: response.feeds[j]._id,
            name: response.subscriptions[j].name,
            tasks: response.subscriptions[j].tasks
          }
        }
      } else {
        console.log("Error loading data.");
      }
      $scope.$apply();
    });
  };
  retrieveAll();

  // New feed functionality.
  /**
   * The new feed that is currently edited.
   */
  $scope.curFeed;
  $scope.newFeed = function() {
    $scope.curFeed = {name: ""};
  };
  $scope.saveOrSubscribeFeed = function(state) {
    switch(state) {
      case ($scope.feedStates.NEW):
        $.ajax('/feeds', {
          type: 'post',
          data: {
            name: $scope.curFeed.name
          }
        }).done(function(saved_feed) {
          retrieveAll();
        });
        break;
      case ($scope.feedStates.SUBSCRIBE):
        $.ajax('/subscriptions', {
          type: 'post',
          data: {
            name: $scope.curFeed.name
          }
        }).done(function(subscribed_feed, success) {
          retrieveAll();
        });
        break;
      default:
        break;
    }
  }

  // New task functionality.
  /**
   * The selected feed.
   */
  $scope.selectedFeed;

  /**
   * The new task that is currently edited.
   */
  $scope.curTask;
  $scope.newTask= function(feed) {
    $scope.selectedFeed = feed;
    $scope.curTask = {name:"", dueDate: "", attachments: undefined};
  };

  $scope.unsubscribe = function(feed) {
    $.ajax('/unsubscribe', {
      type: 'post',
      data: {
        name: feed.name
      }
    }).done(function(feed, success) {
      console.log(feed);
      retrieveAll();
    });
  }

  $scope.addDropboxAttachment = function() {
    var dboptions = {
        success: function(files) {
                   $scope.curTask.attachments = files;
                   $scope.$apply();
        },
        multiselect: true
      }
    Dropbox.choose(dboptions);
  }

  $scope.saveTask = function(name, duedate) {
    $.ajax('/tasks', {
      type: 'post',
      data: {
        feed_id: "FEED_ID????", // <-- get this somehow
        name: curTask.name,
        due_date: curTask.dueDate,
      }
    }).done(function(saved_feed, success) {
      console.log(saved_feed);
      retrieveAll();
    });
    window.console.log(name);
    window.console.log(duedate);
  };

};

