/**
 * The angular controller for feedasana.
 */
feedController = function($scope) {
  $scope.name = "Welcome to feed asana";

  $scope.allSubscriptions = [
    {
      ownerid: "123",
      name: "15-462: Graphics",
      tasks: [
        {name:"pool", due:"Oct 12, 2014"},
        {name:"ray tracer", due:"Nov 23, 2014"},
        {name:"shader", due:"Dec 02, 2014"}
      ]
    },
    {
      ownerid: "456",
      name: "15-466: Photography",
      tasks: [
        {name:"p1 and friends", due:"Oct 12, 2015"},
        {name:"p2 yea...", due:"Nov 23, 2015"},
        {name:"p5 killer", due:"Dec 02, 2018"}
      ]
    },
    {
      ownerid: "789",
      name: "Don's killer workout",
      tasks: [
        {name:"P90X", due:"May 12, 2015"},
        {name:"50 push ups", due:"Dec 30, 2100"}
      ]
 

    }
  ];
}
