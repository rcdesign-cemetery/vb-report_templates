/**
 * Report Templates: class to add reports fastly
 */
var Rep_Templates = {

    // array of pre-defined reasons
    answers: null,
    
    // popup container
    context_menu: null,
    // popup copntiner height
    menu_height: 0,
    error_msg: null,

    // ajax form and its param values
    pseudoform: null,
    url: null,
    postid: 0,

    // information phrases to display to user
    thanks_phrase: '',
    description_msg: '',

    timer_id: null,
    

    /**
     * inits the popup
     * @param answers array of pre-defined reasons
     * @param error_msg to display in case of empty message
     * @param url of current page
     * @param thanks_phrase diaplyed after successful submission
     */
    init: function(answers, url, phrases) {
        if (AJAX_Compatible)
        {
            this.answers = answers;
            this.error_msg = phrases['error'];
            this.thanks_phrase = phrases['thanks'];
            this.description_msg = phrases['description'];

            this.context_menu = new YAHOO.widget.Menu("rep_tmpl_popup",
                                                          {clicktohide: false,
                                                           effect: {
                                                             effect: YAHOO.widget.ContainerEffect.FADE,
                                                             duration: 0.25
                                                          }});
            // Fix for IE7 z-index bug
            if (YAHOO.env.ua.ie && YAHOO.env.ua.ie < 8)
            {
                this.context_menu.cfg.setProperty("position", "dynamic");
                this.context_menu.cfg.setProperty("iframe", true);
                this.context_menu.cfg.setProperty("zindex", 10100);
            }
            this.context_menu.render(document.body);

            var menu_object = fetch_object("rep_tmpl_menu_inner");
            this.menu_height = menu_object.offsetHeight;


            var links = YAHOO.util.Dom.getElementsByClassName("report", "a", document.body);
            for ( var i = 0; i < links .length; i++ ) {
                var index = links[i].href.indexOf("p=");
                if (index > 0)
                {
                    var postid = links[i].href.substr(index+2);
                    YAHOO.util.Event.on(links[i], "click", this.show_popup, postid);
                }
            }


            this.pseudoform = new vB_Hidden_Form('ajax.php');
            this.pseudoform.add_variable('ajax', 1);
            this.pseudoform.add_variable('s', fetch_sessionhash());
            this.pseudoform.add_variable('securitytoken', SECURITYTOKEN);
            this.pseudoform.add_variable('do', 'email_report');
            this.url = url;
        }
    },
    
    /**
     * inserts pre-defined reason into textarea
     * @param id of selected reason
     */
    set_answer: function(id) {
        var textarea = fetch_object('rep_tmpl_message');
        textarea.value = '';
        if (id > 0 && id <= this.answers.length)
        {
            textarea.value = this.answers[id-1];

            var error_msg = fetch_object('rep_tmpl_error');
            error_msg.innerHTML = "";
        }
    },

    /**
     * show popup to the user
     * @param event click event
     * @param postid id of the post
     */
    show_popup: function(event,postid) {
        Rep_Templates.reset_data();
        YAHOO.util.Event.stopEvent(event);
        var elem = event.srcElement? event.srcElement : event.target;
        Rep_Templates.postid = postid;
        var xy = [0,0];

        xy[0] = YAHOO.util.Dom.getX(elem) + 25;
        xy[1] = YAHOO.util.Dom.getY(elem) - Rep_Templates.menu_height;

        if (xy[1] < 0)
        {
            xy[1] = 0;
        }
        Rep_Templates.context_menu.moveTo(xy[0],xy[1]);
        Rep_Templates.context_menu.show();

        fetch_object('rep_tmpl_message').focus();
        YAHOO.util.Event.on(document.body, "click", Rep_Templates.hide_menu);
    },

    /**
     * hides the menu when users click Hide button or click outside of the  popup. Resets data
     * @param optional event. If specified, then user clicked outside.  
     */
    hide_menu: function(event) {
        var is_inside = false;
        if (event)
        {
            // check if click was inside or outside popup
            var obj = event.srcElement? event.srcElement : event.target;
            do {
                if (obj.id == 'rep_tmpl_popup') {
                     is_inside = true;
                    break;
                }
            } while (obj = obj.parentNode);

            if (!is_inside)
            {
                 YAHOO.util.Event.removeListener(document.body, "click", Rep_Templates.hide_menu);
            }
        }

        if (!event || !is_inside)
        {
            Rep_Templates.context_menu.hide();
            Rep_Templates.postid = 0;
        }
    },

    /**
     * reset all fields with default values
     */
    reset_data: function() {
        var error_msg = fetch_object('rep_tmpl_error');
        error_msg.innerHTML = "";

        var phrase = fetch_object('rep_tmpl_phrase');
        phrase.innerHTML = this.description_msg;
        YAHOO.util.Dom.removeClass(phrase, 'rep_tmpl_thanks_message');

        var button = fetch_object('rep_tmpl_submit');
        YAHOO.util.Dom.removeClass(button, 'disabled');
        button.disabled = false;

        var image = fetch_object('rep_tmpl_progress');
        image.style.display = 'none';
    },

    /**
     * sends AJAX request
     * @param event click event
     */
    send_data: function(event) {
    
        var textarea = fetch_object('rep_tmpl_message');
        if (textarea && textarea.value.replace(/^\s\s*/, '').replace(/\s\s*$/, '') != '')
        {
            this.pseudoform.add_variable('postid', this.postid);
            this.pseudoform.add_variable('url',this.url + "&p="+ this.postid + "#post" + this.postid);

            var button = event.srcElement? event.srcElement : event.target;
            button.disabled = true;

            YAHOO.util.Dom.addClass(button, 'disabled');

            var image = fetch_object('rep_tmpl_progress');
            image.style.display = '';

            YAHOO.util.Connect.asyncRequest("POST", 'ajax.php', {
                success: this.handle_ajax_response,
                failure: vBulletin_AJAX_Error_Handler,
                timeout: vB_Default_Timeout,
                scope: this
            }, this.pseudoform.build_query_string() + '&reason=' + textarea.value);
        }
        else
        {
            var error_msg = fetch_object('rep_tmpl_error');
            error_msg.innerHTML = this.error_msg;
        }
        return false;
    },

    /**
     * handles AJAX request
     * @param ajax data returned
     */
    handle_ajax_response: function(ajax) {
        if (ajax.responseXML)
        {
            // check for error first
            var error = ajax.responseXML.getElementsByTagName('error');
            if (error.length)
            {
                this.reset_data();
                var error_msg = fetch_object('rep_tmpl_error');
                error_msg.innerHTML = error[0].firstChild.nodeValue;
            }
            else
            {
                var result = ajax.responseXML.getElementsByTagName('result');
                if (result.length)
                {
                    var image = fetch_object('rep_tmpl_progress');
                    image.style.display = 'none';

                    var phrase = fetch_object('rep_tmpl_phrase');
                    phrase.innerHTML = this.thanks_phrase;
                    YAHOO.util.Dom.addClass(phrase, 'rep_tmpl_thanks_message');

                    this.timer_id = setTimeout('Rep_Templates.handle_timer_expiration()',1000);
                }
            }
        }
    },

    /**
     * hides popup on timer expiration
     */
    handle_timer_expiration: function() {
        clearTimeout(this.timer_id);
        this.hide_menu();
    }
}