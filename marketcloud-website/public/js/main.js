'use strict';

/* global getCookie : true  */
/* global $ */
/* global ga : true  */
/* global addListener : true  */
/* jshint asi:true */

$(function() {




    var enable_analytics = function() {

        document.cookie = '_mc_accepts_cookies=true';
        (function(i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function() {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date();
            a = s.createElement(o),
                m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m)
        })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
        ga('create', 'UA-22994628-4', 'auto');
        ga('send', 'pageview');
        $('#disclaimer-container').remove()
    }

    $('#gotcha').click(enable_analytics)
    $(window).on("scroll", function() {
        enable_analytics()
        $(window).unbind("scroll")
    })



    /*
        @param {lang} string The name of the programming language snippet to show
    */
    var showSnippet = function(lang) {
        return function(evt) {

            evt.preventDefault();

            $('.language.code.active').removeClass('active');
            $('#LanguagePills > li.active').removeClass('active');
            $('#' + lang + '_snippet').addClass('active');
            $(evt.target).parent().addClass('active');

        }
    }

    var showWorkflow = function(framework) {
        return function(evt) {

            evt.preventDefault();

            $('.workflow.code.active').removeClass('active');
            $('#WorkflowPills > li.active').removeClass('active');
            $('#' + framework + '_example').addClass('active');
            $(evt.target).parent().addClass('active');

        }
    }



    /* Binding the three programming languages */
    $('#show_php_snippet_link').on('click touch',showSnippet('php'))
    $('#show_javascript_snippet_link').click(showSnippet('javascript'))
    $('#show_nodejs_snippet_link').click(showSnippet('nodejs'))
    $('#show_php_snippet_link').click(showSnippet('php'))

    $('#show_ionic_example_link').click(showWorkflow('ionic'))
    $('#show_angular_example_link').click(showWorkflow('angular'))


    var createAnAccount = function(evt) {

        var form = $("#home-signup-form");

        mixpanel.identify($('input#email').val());

        form.submit();
    }

    $("#signup_button").click(createAnAccount);



    
    $('input#email').keyup(function(event){
        if(event.keyCode == 13){
            createAnAccount()
        }
    });

});