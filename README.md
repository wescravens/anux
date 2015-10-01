# anux

###Some things should only flow one direction...

Dynamic Flux store service.  No need to write custom stores/actions/dispatchers/everything.  Data will flow through your app like an 80 year old duodenum.

####Wire it up to a service

```js
function APIService ($http, anux) {
	return {
		getUsers: getUsers,
		getNewsFeed: getNewsFeed
    };

    function getUsers (userId) {
		return $http.get('/api/users')
			.then(anux.dispatch('user'))
			.catch(anux.error('user'));
    }

    function getNewsFeed () {
		return $http.get('/api/news')
			.then(anux.dispatch('news'))
			.catch(anux.error('news'));
    }
}
```

####Listen to your stores

```js
function MainCtrl ($scope, apiService, anux) {
	...

	apiService.getUsers(userId);

	anux($scope)
		.listenTo('user', function (users) {
			$scope.users = users;
		})
		.listenTo('news', function (news) {
			$scope.news = news;
		})
		.logErrors();

	...
}
```