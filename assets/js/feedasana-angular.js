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

  // New task functionality.
  $scope.curFeed;
  $scope.curTask;
  $scope.newTask= function(feed) {
    $scope.curFeed = feed;
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
        name: name,
        due_date: duedate
      }
    }).done(function(saved_feed, success) {
      console.log(saved_feed);
    });
    window.console.log(name);
    window.console.log(duedate);
  };

};
