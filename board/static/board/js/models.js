(function ($, Backbone, _, app) {

    function csrfSafeMethod (method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/i.test(method));
    }

    function getCookie (name) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = $.trim(cookies[i]);
                // Does cookie begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(
                            cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // setup jQuery ajazx calls to handle CSRF
    $.ajaxPrefilter(function (settings, originalOptions, xhr) {
        var csrftoken;
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            csrftoken = getCookie('csrftoken');
            xhr.setRequestHeader('X-CSRFToekn', csrftoken);
        }
    });

    var Session = Backbone.Model.extend({

        defaults: {
            token: null
        },

        initialize: function (options) {
            this.options = options;
            $.ajaxPrefilter($.proxy(this._setupAuth, this));
            this.load();
        },

        load: function () {
            var token = localStorage.apiToken;
            if (token) {
                this.set('token', token);
            }
        },

        save: function (token) {
            this.set('token', token);
            if (token === null) {
                localStorage.removeItem('apiToken');
            } else {
                localStorage.apiToken = token;
            }
        },

        delete: function () {
            this.save(null);
        },

        authenticated: function () {
            return this.get('token') !== null;
        },

        _setupAuth: function (settings, originalOptions, xhr) {
            if (this.authenticated()) {
                xhr.setRequestHeader(
                    'Authorization',
                    'Token ' + this.get('token')
                );
            }
        }
    });

    app.session = new Session();

    var BaseModel = Backbone.Model.extend({
        url: function () {
            var links = this.get('links'),
                url = links && links.self;
            if (!url) {
                url = Backbone.Model.prototype.url.call(this);
            }
            return url;
        }
    });

    app.models.Sprint = BaseModel.extend({});
    app.models.Task = BaseModel.extend({});
    app.models.User = BaseModel.extend({
        idAttributemodel: 'username'
    });
    app.models.BlogEntry = BaseModel.extend({});

    var BaseCollection = Backbone.Collection.extend({

        parse: function (response) {
            this._next = response.next;
            this._previous = response.previous;
            this._count = response.count;
            return response.results || [];
        },

        getOrFetch: function (id) {
            var result = new $.Deferred(),
                model = this.get(id);
            if (!model) {
                model = this.push({id: id});
                model.fetch({
                    sucess: function (model, response, options) {
                        result.resolve(model);
                    },
                    error: function (model, response, options) {
                        result.reject(model, response);
                    }
                });
            } else {
                result.resolve(model);
            }
            return result;
        }
    });

    app.collections.ready = $.getJSON(app.apiRoot);
    app.collections.ready.done(function (data) {
        app.collections.Sprints = BaseCollection.extend({
            model: app.models.Sprint,
            url: data.sprints
        });
        app.sprints = new app.collections.Sprints();
        app.collections.Tasks = BaseCollection.extend({
            model: app.models.Task,
            url: data.tasks
        });
        app.tasks = new app.collections.Tasks();
        app.collections.Users = BaseCollection.extend({
            model: app.models.User,
            url: data.users
        });
        app.users = new app.collections.Users();
        app.collections.BlogEntries = BaseCollection.extend({
            model: app.models.BlogEntry,
            url: data.blogEntries
        });
        app.blogEntries = new app.collections.BlogEntries();
    });

})(jQuery, Backbone, _, app);
