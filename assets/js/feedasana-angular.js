/**
 * The angular controller for feedasana.
 */
feedController = function($scope) {
  // Enum types.
  $scope.feedStates = {NEW: "Create", SUBSCRIBE: "Subscribe"};
  $scope.ownerType = {
    SUBSCRIBER: 0,OWNER: 1, BOTH: 2
  };

  $scope.convertDate = function(date) {
    date = new Date(date);
    return date.getMonth() + '-' + date.getDate() + '-' + date.getFullYear();
  };

  // Get all subscriptions.
  $scope.allSubscriptions = {};
  $scope.workspaces = [];
  $scope.allFeeds = [];

  var retrieveAll = function() {
    $.ajax('/feeds', {
      type: 'get'
    }).done(function(response) {
      if (response.success) {
        $scope.workspaces = response.workspaces;
        for (var i = 0; i < response.feeds.length; i++) {
          $scope.allSubscriptions[response.feeds[i]._id] = {
            ownerType : $scope.ownerType.OWNER,
            _id: response.feeds[i]._id,
            name: response.feeds[i].name,
            tasks: response.feeds[i].tasks
          };
        }
        for (var j = 0; j < response.subscriptions.length; j++) {
          var value = $scope.allSubscriptions[response.subscriptions[j]._id];
          if (value) {
            value.ownerType = $scope.ownerType.BOTH;
            continue;
          }
          $scope.allSubscriptions[response.subscriptions[j]._id] = {
            ownerType : $scope.ownerType.SUBSCRIBER,
            _id: response.subscriptions[j]._id,
            name: response.subscriptions[j].name,
            tasks: response.subscriptions[j].tasks
          };
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
  $scope.curFeed = null;
  $scope.newFeed = function() {
    $scope.curFeed = {name: "", workspace: {}};
    $.get('/search', {
      pattern: '8*'
     }, function(response) {
       if (response.success) {
        $scope.allFeeds = response.matches;
       }
    });
  };

  $scope.deleteFeed = function(feed) {
    $.ajax('/feeds', {
      type: 'delete',
      data: {id:feed._id}
    }).done(function() {
      retrieveAll();
    });
  };

  $scope.allRatios = {};

  $scope.getRatio = function(feed, task) {
    $.get('/taskCompletion', {
      feed_name: feed.name,
      task_name: task.name
    }, function(response) {
      var total = 100;
      var completed = Math.random() * 100;
      if (!total) {
        $scope.allRatios[task._id] = 1;
      } else {
        $scope.allRatios[task._id] = completed / total * 100;
      }
      $scope.$apply();
    });
  };

  $scope.saveOrSubscribeFeed = function(state) {
    switch(state) {
      case ($scope.feedStates.NEW):
        $.ajax('/feeds', {
          type: 'post',
          data: $scope.curFeed
        }).done(function(saved_feed) {
          retrieveAll();
        });
        break;
      case ($scope.feedStates.SUBSCRIBE):
        $.ajax('/subscriptions', {
          type: 'post',
          data: $scope.curFeed
        }).done(function(subscribed_feed, success) {
          retrieveAll();
        });
        break;
      default:
        break;
    }
  };

  // New task functionality.
  /**
   * The selected feed.
   */
  $scope.selectedFeed = null;

  /**
   * The new task that is currently edited.
   */
  $scope.curTask = null;
  $scope.newTask= function(feed) {
    $scope.selectedFeed = feed;
    $scope.curTask = {name:"", dueDate: "", attachments: undefined};
  };

  $scope.unsubscribe = function(feed) {
    $.ajax('/unsubscribe', {
      type: 'post',
      data: {
        id: feed._id
      }
    }).done(function(feed, success) {
      retrieveAll();
    });
  };

  $scope.addDropboxAttachment = function() {
    var dboptions = {
      success: function(files) {
        $scope.curTask.attachments = files;
        $scope.$apply();
      },
      multiselect: true
    };
    Dropbox.choose(dboptions);
  };

  $scope.saveTask = function() {
    $.ajax('/tasks', {
      type: 'post',
      data: {
        feed_id: $scope.selectedFeed._id, // <-- get this somehow
        name: $scope.curTask.name,
        due_date: $scope.curTask.dueDate
      }
    }).done(function(saved_feed, success) {
      retrieveAll();
    });
  };
};

