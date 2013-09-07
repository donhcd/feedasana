var app = angular.module('feedasana', []);

app.directive('datepicker', function() {
  return {
  restrict: 'A',
  require : 'ngModel',
  link : function (scope, element, attrs, ngModelCtrl) {
    $(function(){
      element.datepicker({
        dateFormat:'dd/mm/yy',
      onSelect:function (date) {
        ngModelCtrl.$setViewValue(date);
        scope.$apply();
      }
      });
    });
  }
  }
});
