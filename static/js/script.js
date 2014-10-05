$(function(){
    var dbs = [
        {
           'label': 'naa',
            'heading': 'National Archives of Australia',
            'results_per_page': 20
        },
        {
            'label': 'cwgc',
            'heading': 'Commonwealth War Graves Commission',
            'results_per_page': 15
        },
        {
            'label': 'awm-roll',
            'heading': 'Australian War Memorial &ndash; Roll of Honour',
            'results_per_page': 50,
            'path': 'roll_of_honour',
            'roll': 'roll_of_honour'
        },
        {
            'label': 'awm-embarkation',
            'heading': 'Australian War Memorial &ndash; Embarkation Roll',
            'results_per_page': 50,
            'path': 'nominal_rolls/first_world_war_embarkation',
            'roll': 'embarkation'
        },
        {
            'label': 'awm-redcross',
            'heading': 'Australian War Memorial &ndash; Red Cross Wounded &amp; Missing',
            'results_per_page': 50,
            'path': 'wounded_and_missing',
            'roll': 'wounded_and_missing'
        },
        {
            'label': 'awm-awards',
            'heading': 'Australian War Memorial &ndash; Honours &amp; Awards',
            'results_per_page': 50,
            'path': 'honours_and_awards',
            'roll': 'honours_and_awards'
        }
    ];
    var family_name, other_names, service_number;
    function get_params() {
        var vars = [], hash;
        var q = document.URL.split('?')[1];
        if (q !== undefined) {
            q = q.split('&');
            for(var i = 0; i < q.length; i++){
                hash = q[i].split('=');
                vars.push(hash[1]);
                vars[hash[0]] = hash[1];
            }
        }
        return vars;
    }
    function prepare_query_search() {
        params = get_params();
        if (params.length > 0) {
            if (params.family_name !== 'undefined') {
                family_name = params.family_name;
            }
            if (params.other_names !== 'undefined') {
                other_names = params.other_names;
            }
            if (params.service_number !== 'undefined') {
                service_number = params.service_number;
            }
            queue_dbs();
        }
    }
    function prepare_search() {
        reset();
        family_name = $('#family-name').val();
        other_names = $('#other-names').val();
        service_number = $('#service-number').val();
        queue_dbs();
        return false;
    }
    function reset() {
        db_list = [];
        $.extend(db_list, dbs);
        $('[id$="-results"]').empty();
        $('#summary').empty();
    }
    function page_navigation(db, page, total) {
        $div = $('<div></div>');
        start = ((page - 1) * db.results_per_page) + 1;
        end = start + db.results_per_page - 1;
        if (total <= end) {
            end = total;
            $next = $('<span>Next</span>');
        } else {
            $next = $('<a href="#">Next</a>');
            $next.click(function() {
                do_search(db, page + 1);
                return false;
            });
        }
        if (page > 1) {
            $previous = $('<a href="#">Previous</a>');
            $previous.click(function() {
                do_search(db, page - 1);
                return false;
            });
        } else {
            $previous = $('<span>Previous</span>');
        }
        $nav = $('<div class="pull-right"></div>').append($previous).append(' | ').append($next);
        $div.append($nav);
        if (total > 0) {
            $div.append('Results ' + start + ' &ndash; ' + end + ' of ' + total);
        } else {
            $div.append('No results');
        }
        var matches;
        if (total == 1) {
            matches = 'match';
        } else {
            matches = 'matches';
        }
        $('#summary').append('<li><a href="#' + db.label + '-results">' + db.heading + ' (' + total + ' ' + matches + ')</a></li>');
        return $div;
    }
    function queue_dbs() {
        db = db_list.shift();
        if (db) {
            do_search(db, 1);
        }
    }
    function do_search(db, page) {
        var label = db.label;
        if (label == 'naa') {
            do_naa_search(db, page);
        } else if (label == 'cwgc') {
            do_cwgc_search(db, page);
        } else if (label == 'awm-roll' || label == 'awm-embarkation' || label == 'awm-redcross' || label == 'awm-awards' ) {
            do_awm_search(db, page-1);
        }
    }
    function prepare_results_div(type, heading) {
        var $results = $('#' + type + '-results');
        $results.empty();
        var $heading = $('<h4></h4>');
        $heading.append(heading);
        $results.append($heading);
        $results.append('<p id="' + type + '-status"><img src="static/img/loader.gif"> Looking for matching records...</p>');
        return $results;
    }
    function do_naa_search(db, page) {
        var $results = prepare_results_div(db.label, db.heading);
        $.getJSON($SCRIPT_ROOT + '/naa/search/', {'surname': family_name, 'other_names': other_names, 'service_number': service_number, 'page': page}, function(data) {
            $('#naa-status').remove();
            $results.append(page_navigation(db, page, data.total_results));
            var $results_table = $('<table class="table table-striped"></table>');
            $.each(data.results, function(key, result) {
                var $title = $('<h5><a data-id="' + result.identifier + '">' + result.title + ' <i class="icon-plus-sign"></a></i></h5>');
                $title.click(function(event) {
                    event.preventDefault();
                    if ($('.item-details', $(this).parent()).length === 0 || $('.item-details', $title.parent()).is(':hidden')) {
                        get_naa_item($(this));
                    } else {
                        $('.item-details', $(this).parent()).hide();
                        $('i', $(this)).removeClass('icon-minus-sign').addClass('icon-plus-sign');
                        $(this).parent().parent().siblings().show();
                    }
                });
                $row = $('<tr />').append($('<td />').append($title));
                $results_table.append($row);
            });
            $results.append($results_table);
            queue_dbs();
        });

    }
    function get_naa_item(elem) {
        var id = $('a', elem).data('id');
        var $cell = elem.parent();
        if ($('.item-details', $cell).length === 0) {
            $details = $('<div />').addClass('item-details').html('<img src="static/img/loader.gif"> Retrieving item details...');
            $cell.append($details);
            $.getJSON($SCRIPT_ROOT + '/naa/items/' + id + '/', function(data) {
                $cell.parent().siblings().hide();
                $('i', elem).removeClass('icon-plus-sign').addClass('icon-minus-sign');
                $details.empty();
                var digitised = (data.result.digitised_status === true) ? 'yes' : 'no';
                $details.append('<p class="citation">National Archives of Australia: ' + data.result.series + ', ' + data.result.control_symbol + '</p>');
                $details.append('<p><span class="label">Date range:</span> ' + data.result.contents_dates.date_str + '</p>');
                $details.append('<p><span class="label">Location:</span> ' + data.result.location + '</p>');
                $details.append('<p><span class="label">Access status:</span> ' + data.result.access_status + '</p>');
                $details.append('<p><span class="label">Digitised:</span> ' + digitised + '</p>');
                var link;
                if (data.result.digitised_pages > 0) {
                    $details.append('<p><span class="label">Number of pages:</span> ' + data.result.digitised_pages + '</p>');
                    link = 'http://dhistory.org/archives/naa/items/' + data.result.identifier;
                } else {
                    link = 'http://www.naa.gov.au/cgi-bin/Search?O=I&Number=' + data.result.identifier;
                }
                $details.append('<p><a target="_blank" class="btn btn-primary btn-mini" href="' + link + '">View file</a></p>');

            });
        } else {
            $cell.parent().siblings().hide();
            $('i', elem).removeClass('icon-plus-sign').addClass('icon-minus-sign');
            $('.item-details', $cell).show();
        }
    }
    function do_cwgc_search(db, page) {
        var $results = prepare_results_div(db.label, db.heading);
        $.getJSON($SCRIPT_ROOT + '/cwgc/search/', {'surname': family_name, 'forename': other_names, 'service_number': service_number, 'page': page}, function(data) {
            $('#cwgc-status').remove();
            $results.append(page_navigation(db, page, data.total_results));
            var $results_table = $('<table class="table table-striped"></table>');
            $.each(data.results, function(key, result) {
                var $title = $('<h5><a data-id="' + result.id + '">' + result.name + ' : Service number ' + result.service_number + ' : ' + result.service + ' <i class="icon-plus-sign"></a></i></h5>');
                $title.click(function(event) {
                    event.preventDefault();
                    if ($('.item-details', $(this).parent()).length === 0 || $('.item-details', $title.parent()).is(':hidden')) {
                        get_cwgc_item($(this));
                    } else {
                        $('.item-details', $(this).parent()).hide();
                        $('i', $(this)).removeClass('icon-minus-sign').addClass('icon-plus-sign');
                        $(this).parent().parent().siblings().show();
                    }
                });
                $row = $('<tr />').append($('<td />').append($title));
                $results_table.append($row);
            });
            $results.append($results_table);
            queue_dbs();
        });
    }
    function get_cwgc_item(elem) {
        var id = $('a', elem).data('id');
        var $cell = elem.parent();
        if ($('.item-details', $cell).length === 0) {
            $details = $('<div />').addClass('item-details').html('<img src="static/img/loader.gif"> Retrieving item details...');
            $cell.append($details);
            $.getJSON($SCRIPT_ROOT + '/cwgc/items/' + id + '/', function(data) {
                $cell.parent().siblings().hide();
                $('i', elem).removeClass('icon-plus-sign').addClass('icon-minus-sign');
                $details.empty();
                var digitised = (data.result.digitised_status === true) ? 'yes' : 'no';
                $details.append('<p><span class="label">Service number:</span> ' + data.result.service_no + '</p>');
                $details.append('<p><span class="label">Service:</span> ' + data.result.service + '</p>');
                $details.append('<p><span class="label">Rank:</span> ' + data.result.rank + '</p>');
                $details.append('<p><span class="label">Date of death:</span> ' + data.result.date_of_death + '</p>');
                $details.append('<p><span class="label">Age:</span> ' + data.result.age + '</p>');
                $details.append('<p><span class="label">Additional information:</span> ' + data.result.additional_information + '</p>');
                $details.append('<p><a target="_blank" class="btn btn-primary btn-mini" href="' + id + '">View record</a></p>');
            });
        } else {
            $cell.parent().siblings().hide();
            $('i', elem).removeClass('icon-plus-sign').addClass('icon-minus-sign');
            $('.item-details', $cell).show();
        }
    }
    function do_awm_search(db, page) {
        var $results = prepare_results_div(db.label, db.heading);
        var name;
        if (other_names !== '' && !!other_names) {
            name = family_name + ' ' + other_names;
        } else {
            name = family_name;
        }
        $.getJSON($SCRIPT_ROOT + '/awm/' + db.path + '/search/', {'preferred_name': name, 'service_number': service_number, 'page': page}, function(data) {
            $('#' + db.label + '-status').remove();
            $results.append(page_navigation(db, page+1, data.total_results));
            var $results_table = $('<table class="table table-striped"></table>');
            $.each(data.results, function(key, result) {
                var unit;
                if (typeof result.unit !== 'undefined') {
                    unit = result.unit;
                } else {
                    unit = result.roll_title;
                }
                var $title = $('<h5><a href="#" data-roll="' + db.roll + '" data-id="' + result.url + '">' + result.name + ' : Service number ' + result.service_number + ' : ' + unit + ' <i class="icon-plus-sign"></a></i></h5>');
                $title.click(function(event) {
                    event.preventDefault();
                    if ($('.item-details', $(this).parent()).length === 0 || $('.item-details', $title.parent()).is(':hidden')) {
                        get_awm_item($(this));
                    } else {
                        $('.item-details', $(this).parent()).hide();
                        $('i', $(this)).removeClass('icon-minus-sign').addClass('icon-plus-sign');
                        $(this).parent().parent().siblings().show();
                    }
                });
                $row = $('<tr />').append($('<td />').append($title));
                $results_table.append($row);
            });
            $results.append($results_table);
            queue_dbs();
        });
    }
    function get_awm_item(elem) {
        var url = $('a', elem).data('id');
        var id = url.replace('?p=', '/');
        var roll = $('a', elem).data('roll');
        var $cell = elem.parent();
        if ($('.item-details', $cell).length === 0) {
            $details = $('<div />').addClass('item-details').html('<img src="static/img/loader.gif"> Retrieving item details...');
            $cell.append($details);
            $.getJSON($SCRIPT_ROOT + '/awm/items/' + roll + '/' + id + '/', function(data) {
                $cell.parent().siblings().hide();
                $('i', elem).removeClass('icon-plus-sign').addClass('icon-minus-sign');
                $details.empty();
                var digitised = (data.result.digitised_status === true) ? 'yes' : 'no';
                $details.append('<p><span class="label">Service number:</span> ' + data.result.service_number + '</p>');
                if (typeof data.result.also_known_as !== 'undefined' && data.result.also_known_as.length > 0) {
                    $details.append('<p><span class="label">Also known as:</span> ' + data.result.also_known_as.join('; ') + '</p>');
                }
                if (typeof data.result.rank !== 'undefined' && !!data.result.rank) {
                    $details.append('<p><span class="label">Rank:</span> ' + data.result.rank + '</p>');
                }
                if (typeof data.result.unit !== 'undefined' && !!data.result.unit) {
                    $details.append('<p><span class="label">Unit:</span> ' + data.result.unit + '</p>');
                }
                if (typeof data.result.service !== 'undefined' && !!data.result.service) {
                    $details.append('<p><span class="label">Service:</span> ' + data.result.service + '</p>');
                }
                if (typeof data.result.date_of_death !== 'undefined' && !!data.result.date_of_death) {
                    $details.append('<p><span class="label">Date of death:</span> ' + data.result.date_of_death + '</p>');
                }
                if (typeof data.result.cause_of_death !== 'undefined' && !!data.result.cause_of_death) {
                    $details.append('<p><span class="label">Cause of death:</span> ' + data.result.cause_of_death + '</p>');
                }
                if (typeof data.result.place_of_death !== 'undefined' && !!data.result.place_of_death) {
                    $details.append('<p><span class="label">Place of death:</span> ' + data.result.place_of_death + '</p>');
                }
                if (typeof data.result.date_of_embarkation !== 'undefined' && !!data.result.date_of_embarkation) {
                    $details.append('<p><span class="label">Date of embarkation:</span> ' + data.result.date_of_embarkation + '</p>');
                }
                if (typeof data.result.place_of_embarkation !== 'undefined' && !!data.result.place_of_embarkation) {
                    $details.append('<p><span class="label">Place of embarkation:</span> ' + data.result.place_of_embarkation + '</p>');
                }
                if (typeof data.result.ship_embarked_on !== 'undefined' && !!data.result.ship_embarked_on) {
                    $details.append('<p><span class="label">Ship embarked on:</span> ' + data.result.ship_embarked_on + '</p>');
                }
                if (typeof data.result.award !== 'undefined' && !!data.result.award) {
                    $details.append('<p><span class="label">Award:</span> ' + data.result.award + '</p>');
                }
                if (typeof data.result.recommendation !== 'undefined' && !!data.result.recommendation) {
                    $details.append('<p><span class="label">Recommendation:</span> ' + data.result.recommendation + '</p>');
                }
                $details.append('<p><a target="_blank" class="btn btn-primary btn-mini" href="' + url + '">View record</a></p>');
            });
        } else {
            $cell.parent().siblings().hide();
            $('i', elem).removeClass('icon-plus-sign').addClass('icon-minus-sign');
            $('.item-details', $cell).show();
        }
    }

    $('#search').click(prepare_search);
    reset();
    prepare_query_search();
});
