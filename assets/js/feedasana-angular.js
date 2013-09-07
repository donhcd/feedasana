/**
 * The angular controller for feedasana.
 */
feedController = function($scope) {
  $scope.allSubscriptions = [
    {
      owner: false,
      name: "15-462: Graphics",
      tasks: [
        {name:"pool", due:"Oct 12, 2014"},
        {name:"ray tracer", due:"Nov 23, 2014"},
        {name:"shader", due:"Dec 02, 2014"}
      ]
    },
    {
      owner: false,
      name: "15-466: Photography",
      tasks: [
        {name:"p1 and friends", due:"Oct 12, 2015"},
        {name:"p2 yea...", due:"Nov 23, 2015"},
        {name:"p5 killer", due:"Dec 02, 2018"}
      ]
    },
    {
      owner: true,
      name: "Don's killer workout",
      tasks: [
        {name:"P90X", due:"May 12, 2015"},
        {name:"50 push ups", due:"Dec 30, 2100"}
      ]
    }
  ];

  // New feed functionality.
  /**
   * The new feed that is currently edited.
   */
  $scope.curFeed;
  $scope.newFeed = function() {
    $scope.curFeed = {name: ""};
  };
  $scope.feedStates = {NEW: "Create", SUBSCRIBE: "Subscribe"}
  $scope.saveOrSubscribeFeed = function(state) {
    switch(state) {
      case ($scope.feedStates.NEW):
        $.ajax('/feeds', {
          type: 'post',
          data: {
            name: $scope.curFeed.name
          }
        }).done(function(saved_feed, success) {
          console.log("saved: " + saved_feed);
        });
        break;
      case ($scope.feedStates.SUBSCRIBE):
        $.ajax('/subscriptions', {
          type: 'post',
          data: {
            name: $scope.curFeed.name
          }
        }).done(function(saved_feed, success) {
          console.log("subscribed: " + saved_feed);
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
    });
    window.console.log(name);
    window.console.log(duedate);
  };

};
