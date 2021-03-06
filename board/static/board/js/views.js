(function ($, Backbone, _, app) {

    var TemplateView = Backbone.View.extend({

        templateName: '',

        initialize: function () {
            this.template = _.template($(this.templateName).html());
        },

        render: function () {
            var context = this.getContext(),
                html = this.template(context);
            this.$el.html(html);
        },

        getContext: function () {
            return {};
        }
    });

    var FormView = TemplateView.extend({

        errorTemplate: _.template('<span class="error"><%- msg %></span>'),

        events: {
            'submit form': 'submit'
        },
 
        showErrors: function (errors) {
            _.map(errors, function (fieldErrors, name) {
                var field = $(':input[name=' + name + ']', this.form),
                    label = $('label[for=' + field.attr('id') + ']', this.form);
                if (label.length === 0) {
                    label = $('label', this.form).first();
                }
                function appendError (msg) {
                    label.before(this.errorTemplate({msg: msg}));
                }
                _.map(fieldErrors, appendError, this);
            }, this);
        },

        serializeForm: function (form) {
            return _.object(_.map(form.serializeArray(), function (item) {
                // return object to tuple of (name, value)
                return [item.name, item.value];
            }));
        },

        submit: function (event) {
            // each extending view needs to add to this.
            event.preventDefault();
            this.form = $(event.currentTarget);
            this.clearErrors();
        },

        failure: function (xhr, status, error) {
            var errors = xhr.responseJSON;
            this.showErrors(errors);
        },

        clearErrors: function () {
            $('.error', this.form).remove();
        },

        done: function (event) {
            if (event) {
                event.preventDefault();
            }
            this.trigger('done');
            this.remove();
        },

        modelFailure: function (model, xhr, options) {
            var errors = xhr.responseJSON;
            this.showErrors(errors);
        }
    });

    var LoginView = FormView.extend({

        id: 'login',
        templateName: '#login-template',

        submit: function (event) {
            var data = {};
            FormView.prototype.submit.apply(this, arguments);
            data = this.serializeForm(this.form);
            $.post(app.apiLogin, data)
                .success($.proxy(this.loginSuccess, this))
                .fail($.proxy(this.failure, this));
        },

        loginSuccess: function (data) {
            app.session.save(data.token);
            this.trigger('login', data.token);
        }
    });

    var NewSprintView = FormView.extend({

        templateName: '#new-sprint-template',
        className: 'new-sprint',

        events: _.extend({
            'click button.cancel': 'done',
        }, FormView.prototype.events),

        submit: function (event) {
            var self = this,
                attributes = {};
            FormView.prototype.submit.apply(this, arguments);
            attributes = this.serializeForm(this.form);
            app.collections.ready.done( function () {
                app.sprints.create(attributes, {
                    wait: true,
                    success: $.proxy(self.success, self),
                    error: $.proxy(self.modelFailure, self)
                });
            });
        },

        success: function (model) {
            this.done();
            window.location.hash = '#sprint/' + model.get('id');
        }
    });

    var HomepageView = TemplateView.extend({

        templateName: '#home-template',
        events: {
            'click button.add': 'renderAddForm'
        },

        initialize: function (options) {
            var self = this;
            TemplateView.prototype.initialize.apply(this, arguments);
            app.collections.ready.done( function () {
                var end = new Date();
                end.setDate(end.getDate() - 7);
                end = end.toISOString().replace(/T.*/g, '');
                app.sprints.fetch({
                    data: {end_min: end},
                    success: $.proxy(self.render, self)
                });
            });
        },
        
        getContext: function () {
            return {sprints: app.sprints || null};
        },

        renderAddForm: function (event) {
            var view = new NewSprintView(),
                link = $(event.currentTarget);
            event.preventDefault();
            link.before(view.el);
            link.hide();
            view.render();
            view.on('done', function () {
                link.show();
            });
        }
    });

    var BlogView = TemplateView.extend({

        templateName: '#blog-template',
        events: {
            'click button.add': 'renderAddForm'
        },

        initialize: function (options) {
            var self = this;
            TemplateView.prototype.initialize.apply(this, arguments);
            app.collections.ready.done( function () {
                app.blogEntries.fetch({
                    success: $.proxy(self.render, self)
                });
            });
        },

        renderAddForm: function (event) {
            var view = new BlogCreateView(),
                link = $(event.currentTarget);
            event.preventDefault();
            link.before(view.el);
            link.hide();
            view.render();
            view.on('done', function () {
                link.show();
            });
        },

        getContext: function () {
            entries = app.blogEntries || null;
            console.log(entries);
            return {
                entries: entries
            };
        }
    });

    var BlogCreateView = FormView.extend({

        templateName: '#blog-create-template',
        className: 'blog-create-entry',

        events: _.extend({
            'click button.cancel': 'done',
        }, FormView.prototype.events),

        submit: function (event) {
            var self = this,
                attributes = {};
            FormView.prototype.submit.apply(this, arguments);
            attributes = this.serializeForm(this.form);
            app.collections.ready.done( function () {
                app.blogEntries.create(attributes, {
                    wait: true,
                    success: $.proxy(self.success, self),
                    error: $.proxy(self.modelFailure, self)
                });
            });
        },

        success: function (model) {
            this.done();
            window.location.hash = '#blog';
            this.render();
        }

    });

    var HeaderView = TemplateView.extend({

        tagName: 'header',
        templateName: '#header-template',

        events: {
            'click a.logout': 'logout'
        },

        getContext: function () {
            return {authenticated: app.session.authenticated()};
        },

        logout: function (event) {
            event.preventDefault();
            app.session.delete();
            window.location = '/';
        }
    });

    var StatusView = TemplateView.extend({

        tagname: 'section',
        className: 'status',
        templateName: '#status-template',

        initialize: function (options) {
            TemplateView.prototype.initialize.apply(this, arguments);
            this.sprint = options.sprint;
            this.status = options.status;
            this.title = options.title;
        },

        getContext: function () {
            return {sprint: this.sprint, title: this.title};
        }
    });

    var SprintView = TemplateView.extend({

        templateName: '#sprint-template',

        initialize: function (options) {

            var self = this;
            TemplateView.prototype.initialize.apply(this, arguments);
            this.sprintId = options.sprintId;
            this.sprint = null;
            this.statuses = {
                unassigned: new StatusView({
                    sprint: null, status: 1, title: 'Backlog'}),
                todo: new StatusView({
                    sprint: this.sprintId, status:1, title: 'Not started'}),
                active: new StatusView({
                    sprint: this.sprintId, status:2, title: 'In Development'}),
                testing: new StatusView({
                    sprint: this.sprintId, status:3, title: 'In Testing'}),
                done: new StatusView({
                    sprint: this.sprintId, status:4, title: 'Completed'})
            };

            app.collections.ready.done(function () {
                app.sprints.getOrFetch(self.sprintId)
                    .done(function (sprint) {
                        self.sprint = sprint;
                        self.render();
                    })
                    .fail(function (sprint) {
                        self.sprint = sprint;
                        self.sprint.invalid = true;
                        self.render();
                    });
            });
        },

        getContext: function () {
            return {sprint: this.sprint};
        },

        render: function () {
            TemplateView.prototype.render.apply(this, arguments);
            _.each(this.statuses, function (view, name) {
                $('.tasks', this.$el).append(view.el);
                view.delegateEvents();
                view.render();
            }. this);
        }

    });

    app.views.HomepageView = HomepageView;
    app.views.LoginView = LoginView;
    app.views.HeaderView = HeaderView;
    app.views.SprintView = SprintView;
    app.views.BlogView = BlogView;

})(jQuery, Backbone, _, app);
