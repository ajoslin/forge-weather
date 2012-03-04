$(function() {
	var models={};
	var views={};
	var collections={};

	//Helper function to take google api's image link and turn it into local
	function formatImgSrc(imgURL) {
		return 'resources/'+/[a-z_]*.gif/.exec(imgURL)[0];
	};

	/*
	 * Models
	 */

	models.weatherInfo = Backbone.Model.extend({
		defaults: {
			location: "27615",
			date: "none",
		},

		readFromXML: function(xmlDoc) {
			var $el = $('forecast_information', xmlDoc);
			//location: if postal code exists, use that. else use the city
			this.set('location', $('city', $el).attr('data') + ' ' + $('postal_code', $el).attr('data'));
			this.set('date', $('forecast_date', $el).attr('data'));
		}
	});

	models.condition = Backbone.Model.extend({
		defaults: {
			condition: "Ownage",
			temp: 0,
			humidity: "Humidity: -1%",
			wind: "Wind: Down at 3 mph",
			icon: "resources/forge-error.gif",
		},

		readFromXML: function(xmlDoc) {
			var $el = $('current_conditions', xmlDoc);
			this.set('condition', $('condition', $el).attr('data'));
			this.set('temp', $('temp_f', $el).attr('data'));
			this.set('humidity', $('humidity', $el).attr('data'));
			this.set('wind', $('wind_condition', $el).attr('data'));
			this.set('icon', formatImgSrc($('icon', $el).attr('data')));
		}
	});

	models.forecast = Backbone.Model.extend({
		defaults: {
			day_of_week: 'Faceday',
			low: -333,
			high: 5555,
			icon: "resources/sunny.gif",
			condition: "Chuck Norris",
		},

		readFromXML: function($el) {
			this.set('day_of_week', $('day_of_week', $el).attr('data'));
			this.set('low', $('low', $el).attr('data'));
			this.set('high', $('high', $el).attr('data'));
			this.set('icon', formatImgSrc($('icon', $el).attr('data')));
			this.set('condition', $('condition', $el).attr('data'));
		}
	});
	
	/*
	 * Collections
	 */

	collections.forecastList = Backbone.Collection.extend({
		model: models.forecast,

		readFromXML: function(xmlDoc) {
			var self = this; //because of each
			self.reset();
			$("forecast_conditions", xmlDoc).each(function(index, element) {
				var forecast = new models.forecast;
				self.add(forecast);
				forecast.readFromXML(element);
			});
			//so there won't be a re-render each time any of the children are changed, 
			//we do custom fetch event
			self.trigger('fetch');
		}
	});

	/*
	 * Views
	 */

	views.condition = Backbone.View.extend({
		template: "<table><tr><td>" +
			"<img src=\"{{icon}}\">" +
			"<div>{{condition}}</div>" +
			"<div>{{temp}}&deg;F</div>" +
			"<div>{{humidity}}</div>" +
			"<div>{{wind}}" +
		"</td></tr></table>",

		initialize: function() {
			this.model.bind('change', this.render, this);
		},

		render: function() {
			$(this.el).html( Mustache.to_html(this.template, this.model.toJSON()) );
			return this; //for chaining
		}
	});

	views.weatherInfo = Backbone.View.extend({
		template: "<span>{{location}}</span><br />" +
		"<span>{{date}}</span>",

		initialize: function() {
			this.model.bind('change', this.render, this);
		},

		render: function() {
			$(this.el).html( Mustache.to_html(this.template, this.model.toJSON()) );
			return this; //for chaining
		}
	})
	
	views.forecastList = Backbone.View.extend({
		template: "<td>" +
			"<h2>{{day_of_week}}</h2>" +
			"<img src=\"{{icon}}\">" +
			"<h6>{{condition}}</h6>" +
			"<h6>{{low}}&deg;F - {{high}}&deg;F</h6>" +
		"</td>",

		initialize: function() {
			//we have a custom event called 'fetch',
			//which is custom triggered when fetching
			//the weather data and changing day-list
			//we use this instead of change,
			//because change is called each time any child changes
			this.model.bind('fetch', this.render, this);
		},

		render: function() {
			//console.log("rendering forecastList");
			var str="";
			this.model.each(function(forecast) {
				str += Mustache.to_html(this.template, forecast.toJSON());
			}, this);
			$(this.el).html(str);
			return this; //for chaining
		}
	});

	views.AppMain = Backbone.View.extend({
		el: 'body',

		render: function() {
			var info = new models.weatherInfo();
			var infoview = new views.weatherInfo({
				model: info,
				el: '#forecast-info'
			}).render();

			var cond = new models.condition;
			var condview = new views.condition({
				model: cond,
				el: '#current-condition'
			}).render();

			var list = new collections.forecastList;
			list.add(new models.forecast({day: 6}));
			list.add(new models.forecast({day: 2}));
			var listview = new views.forecastList({
				model: list,
				el: '#forecast-table-row'
			}).render();

			this.fetchWeatherData(info, cond, list);
		},

		fetchWeatherData: function(info, cond, list) {
			forge.logging.log("model.weatherInfo.fetchWeather() at "+info.get('location'));
			forge.request.ajax({
				url: "http://www.google.com/ig/api?weather="+info.get('location'),
				dataType: "xml",
				success: function(data, textStatus, jqXHR) {
					forge.logging.log("model.weatherInfo.fetchweather() - success!");
					info.readFromXML(data);
					cond.readFromXML(data);
					list.readFromXML(data);
				},
				error: function(jqXHR, textStatus, errorThrown) {
					forge.logging.log("model.WeatherInfo.fetchWeather() - error! "+textStatus);
				}
			});
		}
	});

	(new views.AppMain).render();

});
