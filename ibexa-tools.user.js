// ==UserScript==
// @name         Ibexa Tools
// @version      0.6
// @description  Add some usefull tools for Ibexa Admin Interface
// @author       Steve Cohen
// @include      *
// @updateURL    https://github.com/stevecohenfr/userscript-ibexa-tools/raw/refs/heads/main/ibexa-tools.user.js
// @downloadURL  https://github.com/stevecohenfr/userscript-ibexa-tools/raw/refs/heads/main/ibexa-tools.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// ==/UserScript==

const CONFIG = {
    FUNCTIONS : {
        ENABLE_RENAME_PAGE : true,
        ENABLE_CONTENTTYPE_SHORTCUT : true,
        ENABLE_FAST_INFO_ACCESS : true,
        ENABLE_CONTENTTYPE_FIELD_POSITION: true,
        ENABLE_MORE_INFO_BLOCK : true,
        ENABLE_FRONT_LINK : false,
        ENABLE_USER_LINK : true,
        ENABLE_CONTENTTYPE_RELATIONLINK : true,
        ENABLE_CHILDREN_CONTENTTYPE_IDENTIFIER : true,
        ENABLE_CONTENTVIEW_ATTRIBUTE_IDENTIFIER: true
    },
    EZ_API_BASE_DATA : {
        url: "/api/ibexa/v2",
        type: "GET",
        beforeSend: function(xhr){
            xhr.setRequestHeader('Accept', 'application/vnd.ibexa.api.ContentInfo+json');
        }
    }
};

/* globals $ MonkeyConfig GM_config */

(function ($, undefined) {
    $(function () {
        'use strict';

        function initConfig() {
            GM_config.init(
                {
                    'id': 'MyConfig', // The id used for this instance of GM_config
                    'title': 'Script Settings', // Panel Title
                    'fields': // Fields object
                    {
                        'Name': // This is the id of the field
                        {
                            'label': 'Name', // Appears next to field
                            'type': 'text', // Makes this setting a text field
                            'default': 'Sizzle McTwizzle' // Default value if user doesn't change it
                        }
                    }
                });
        }

        /*GM_registerMenuCommand('Run this now', function() {
            alert("Put script's main function here");
        }, 'r');*/ // OU EST LE BOUTON ???

        // Inject settings button
        if ($('meta[name=SiteAccess]').attr('content') === 'admin') {
            $('<li class="nav-item ez-user-menu__item ezplatformtools"><a href="#" class="nav-link">eZ Platform Tools</a></li>').insertBefore('.nav.navbar-nav.ez-user-menu__items > .nav-item.ez-user-menu__item.last');
            $('.ez-user-menu__item.ezplatformtools').click(function() {
                console.log("Opening ezplatformtools settings");
                GM_config.open();
            });
        }

        function renamePage() {
            // Exemple : construire un titre personnalisé selon l'URL ou les éléments visibles
            const path = window.location.pathname;

            let titre = document.querySelector('h1')?.textContent?.trim() !== "" ? document.querySelector('h1')?.textContent?.trim() : "Ibexa DXP";

            if (path.includes('/content/edit/')) {
                const titrePage = document.querySelector('h1')?.textContent?.trim();
                titre = "✏️ Édition : " + (titrePage || 'Contenu');
            } else if (path.includes('/view/content/')) {
                const titrePage = document.querySelector('h1, .content-title')?.textContent?.trim();
                titre = "👁️ Tree : " + (titrePage || 'Contenu');
            } else if (path.includes('/dashboard')) {
                titre = "🏠 Tableau de bord";
            } else if (path.includes('/user')) {
                titre = "👤 Gestion des utilisateurs";
            }

            // Appliquer le nouveau titre
            document.title = titre;
        }

        function addFieldPositionToContentTypes() {
            // Ne fait rien si la page ne correspond pas à un ContentType
            if (!$('body').hasClass('ibexa-content-type-view')) return;

            const contentTypeId = window.location.pathname.split('/').pop();
            const table = $('.ibexa-table');
            const tbodyRows = table.find('tbody tr');

            // Ajoute l'en-tête "Position"
            table.find('thead tr').append(`
        <th class="ibexa-table__header-cell ibexa-table__head-cell--field-definitions-head">
            <span class="ibexa-table__header-cell-text-wrapper">Position</span>
        </th>
    `);

            // Appel API pour récupérer les fieldDefinitions
            const objdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
            objdata.url = `${CONFIG.EZ_API_BASE_DATA.url}/content/types/${contentTypeId}`;

            $.ajax(objdata).then(response => {
                const fields = response.ContentType?.FieldDefinitions?.FieldDefinition;

                if (!fields) return;

                // Mappe les positions par identifiant de champ
                const positionByIdentifier = {};
                fields.forEach(fd => {
                    positionByIdentifier[fd.identifier] = fd.position;
                });

                // Injecte la colonne position dans chaque ligne
                tbodyRows.each(function () {
                    const identifier = $(this).find('td:nth-child(2)').text().trim();
                    const position = positionByIdentifier[identifier] ?? '—';
                    $(this).append(`<td class="ibexa-table__cell">${position}</td>`);
                });
            });
        }

        function contenttypeShortcut() {
            if ($('body').hasClass('ibexa-content-view')) {
                var mfu = $('#ibexa-mfu');
                var classNameH4 = $('.ibexa-page-title__bottom span.ibexa-icon-tag');
                var contenttypeurl = '/contenttypegroup/{contenttypegroupid}/contenttype/{contenttypeid}';

                var contentId = $('#content_edit_content_info').val();
                var objdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                objdata.url = objdata.url + "/content/objects/" + contentId;

                let contenttypeId = null;
                let contenttypeGroupId = null;
                $.ajax(objdata)
                    .then(function(response){
                    var contenttypehref = response.Content.ContentType._href;
                    var contenttypedata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                    contenttypedata.url = contenttypehref;
                    return $.ajax(contenttypedata)
                }).then(function(response) {
                    contenttypeId = response.ContentType.id;
                    var contenttypegrouphref = response.ContentType.Groups._href;
                    var contenttypegroupdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                    contenttypegroupdata.url = contenttypegrouphref;
                    return $.ajax(contenttypegroupdata)
                }).then(function(response) {
                    console.log(response);
                    contenttypeGroupId = response.ContentTypeGroupRefList.ContentTypeGroupRef[0]._href.split('/').pop();
                    var link = contenttypeurl
                    .replace("{contenttypegroupid}", contenttypeGroupId)
                    .replace("{contenttypeid}", contenttypeId);
                    var contenttypeIdentifier = mfu.data("parent-content-type-identifier");
                    classNameH4.html('<a title="' + contenttypeIdentifier + '" target="_blank" href="' + link + '">' + classNameH4.text() + '</a>');
                });
            }
        }

        function injectFastInfoAccess() {
            if ($('body').hasClass('ibexa-content-view')) {
                var technicalDetailsContent = $('div.ibexa-details:nth-child(2)').clone();

                $('#ibexa-tab-location-view-content').prepend(technicalDetailsContent);
            }
        }

        function addMoreInfoBlock() {
            if ($('body').hasClass('ibexa-content-view')) {
                var mfu = $('#ez-mfu');
                var locationPath = mfu.data('parent-location-path');
                var $blockHeader = $('<div class="ez-table-header"><div class="ez-table-header__headline">More details</div><div>eZPlatform Tools</div></div>');
                var $blockBody = $(
                    '<div class="ez-scrollable-table-wrapper ezplatform-tools">' +
                    '    <table class="table">' +
                    '        <thead>' +
                    '        <tr>' +
                    '            <th>Path</th>' +
                    '        </tr>' +
                    '        </thead>' +
                    '        <tbody>' +
                    '        <tr>' +
                    '            <td>' +
                    '                ' + locationPath +
                    '            </td>' +
                    '        </tr>' +
                    '        </tbody>' +
                    '    </table>' +
                    '</div>'
                );

                $('#ez-tab-location-view-details').prepend($blockHeader, $blockBody);
            }
        }

        function addFrontLink() {
            var title = $('.ez-page-title__content-item');
            var uri = $('#ez-tab-location-view-urls table:last-child tbody tr:first-child td:first-child').text();
            var link = $('<a href="' + uri + '" title="Open in front"><svg style="width:1rem;height:1rem;" class="ez-icon ez-icon-edit"><use xlink:href="/bundles/ezplatformadminui/img/ez-icons.svg#open-newtab"></use></svg></a>');
            title.append(link);
        }

        function addLinkToCreators() {
            if ($('body').hasClass('ibexa-content-view')) {
                var contentId = $('#content_edit_content_info').val();
                var objdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                objdata.url = objdata.url + "/content/objects/" + contentId;

                /* Creator */
                $.ajax(objdata)
                    .then(function(response){
                    var userhref = response.Content.Owner._href;
                    var userdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                    userdata.url = userhref;
                    return $.ajax(userdata)
                })
                    .then(function(response){
                    var userid = response.User._id;
                    var text = $('#ez-tab-location-view-details .ez-scrollable-table-wrapper:not(.ezplatform-tools):nth(0) > table > tbody > tr > td:nth-child(1)').text();
                    var regExp = /\(([^)]+)\)/;
                    var matches = regExp.exec(text);
                    var date = matches[0];
                    var name = text.replace(/ *\([^)]*\) */g, "").trim();
                    $('#ez-tab-location-view-details .ez-scrollable-table-wrapper:not(.ezplatform-tools):nth(0) > table > tbody > tr > td:nth-child(1)').html('<a target="_blank" title="eZPlatform Tools" href="/view/content/' + userid + '">' + name + '</a> ' + date)
                });

                /* Updater */
                $.ajax(objdata)
                    .then(function(response){
                    var lastversionhref = response.Content.CurrentVersion._href;
                    var lastversiondata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                    lastversiondata.url = lastversionhref;
                    return $.ajax(lastversiondata)
                })
                    .then(function(response){
                    var lastversioncreatorhref = response.Version.VersionInfo.Creator._href;
                    var lastversioncreatordata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                    lastversioncreatordata.url = lastversioncreatorhref;
                    return $.ajax(lastversioncreatordata)
                })
                    .then(function(response){
                    var $td = $('#ez-tab-location-view-details .ez-scrollable-table-wrapper:not(.ezplatform-tools):nth(0) > table > tbody > tr > td:nth-child(2)');
                    var userid = response.User._id;
                    var text = $td.text();
                    var regExp = /\(([^)]+)\)/;
                    var matches = regExp.exec(text);
                    var date = matches[0];
                    var name = text.replace(/ *\([^)]*\) */g, "").trim();
                    $td.html('<a target="_blank" title="eZPlatform Tools" href="/view/content/' + userid + '">' + name + '</a> ' + date)
                });
            }
        }

        function addContenttypeRelationLink() {
            if ($('body').hasClass('ibexa-content-type-view')) {
                var pageURL = window.location.href;
                var lastURLSegment = pageURL.substr(pageURL.lastIndexOf('/') + 1);

                var objdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                objdata.url = objdata.url + "/content/types/"+lastURLSegment;
                /* ContentType */
                $.ajax(objdata)
                    .then(function(response){
                    var fieldDefinitions = response.ContentType.FieldDefinitions.FieldDefinition;
                    for (var i = 0; i < fieldDefinitions.length; i++) {
                        var fd = fieldDefinitions[i];
                        if (fd.fieldType === 'ezobjectrelationlist') {
                            var identifier = fd.identifier;
                            var td = $('.table.ez-table:nth(2)').find('tbody tr td:contains("'+identifier+'")').parent().find('td:nth(1)');
                            var locationId = fd.fieldSettings.selectionDefaultLocation;
                            td.html('<a target="_blank" title="eZPlatform Tools" href="/content/location/' + locationId + '">' + td.html() + '</a> ')
                        }
                    }
                });
            }
        }

        function addChildrenContenttypeIdentifier() {
            var contenttype = '/contenttypegroup/{contenttypegroupid}/contenttype/{contenttypeid}';
            // If content is not a container
            if (typeof $('.ez-sil').data('items') === 'undefined') return;
            var items = $('.ez-sil').data('items').SubitemsList.SubitemsRow;
            if ($('body').hasClass('ez-content-view')) {
                var children = $('tbody.c-table-view__body .c-table-view-item__cell--content-type');
                children.each(function(index, item) {
                    var link = $(item).siblings('.c-table-view-item__cell--name').find('a').attr('href');
                    var locationId = link.substr(link.lastIndexOf('/') + 1);
                    console.log(locationId);
                    var content = items.find(elem => {
                        console.log(elem);
                        return elem.Location.id == locationId;
                    }).Content;
                    var objdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                    objdata.url = content.ContentType._href;
                    /* ContentType */
                    $.ajax(objdata).then(function(response){
                        $(item).attr('title', response.ContentType.identifier);
                        var text = $(item).find('.c-table-view-item__text-wrapper').text();
                        var link = contenttype
                        .replace("{contenttypegroupid}", 1) // Apparement OSEF du contenttypegroupid 🥴
                        .replace("{contenttypeid}", response.ContentType.id);
                        $(item).find('.c-table-view-item__text-wrapper').html('<a target="_blank" href="' + link + '">' + text + '</a>');
                    });
                });
            }

            // $('.ez-sil').data('items') n'est pas mis à jour après la pagination...

            /*var checkPaginate = setInterval(function() {
                if ($('.m-sub-items__pagination-info > strong:nth-child(1)').text() === '0') {
                    // Loading new page
                    clearInterval(checkPaginate);
                    var checkPaginateFinish = setInterval(function() {
                        if ($('.m-sub-items__pagination-info > strong:nth-child(1)').text() !== '0') {
                            // New page loaded
                            clearInterval(checkPaginateFinish);
                            setTimeout(function() {
                                addChildrenContenttypeIdentifier();
                            }, 1000);
                        }
                    }, 200);
                }
            }, 200);*/
        }

        function addContentViewAttributeIdentifier() {
            addGlobalStyle('.ez-content-field-name > span.identifier { ' +
                           'float: right;' +
                           'color: gray;' +
                           'font-style: italic;' +
                           'font-weight: normal;' +
                           'font-size: 15px;' +
                           '}')

            var mfu = $('#ez-mfu');
            var contenttypeid = mfu.data('parent-content-type-id');
            var objdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
            objdata.url = objdata.url + "/content/types/"+contenttypeid;
            $.ajax(objdata)
                .then(function(response){
                var fieldDefinitions = response.ContentType.FieldDefinitions.FieldDefinition;
                for (var i = 0; i < fieldDefinitions.length; i++) {
                    var fd = fieldDefinitions[i];
                    var attributeName = fd.names.value[0]["#text"];
                    var attrHtml = $('.ez-content-field-name:contains("' + attributeName + ':")');
                    attrHtml.html(attrHtml.html() + '<span class="identifier">' + fd.identifier + '</span>');
                }
            });
        }

        function addGlobalStyle(css) {
            var head, style;
            head = document.getElementsByTagName('head')[0];
            if (!head) { return; }
            style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = css;
            head.appendChild(style);
        }

        function UrlExists(url) {
            var http = new XMLHttpRequest();
            http.open('HEAD', url, false);
            http.send();
            return http.status !== 404;
        }

        function getSiteaccess() {
            return $('meta[name=SiteAccess]').attr("content");
        }

        initConfig();

        if (getSiteaccess() === "admin") {
            if (CONFIG.FUNCTIONS.ENABLE_CONTENTTYPE_SHORTCUT) contenttypeShortcut();
            if (CONFIG.FUNCTIONS.ENABLE_RENAME_PAGE) renamePage();
            if (CONFIG.FUNCTIONS.ENABLE_FAST_INFO_ACCESS) injectFastInfoAccess();
            if (CONFIG.FUNCTIONS.ENABLE_CONTENTTYPE_FIELD_POSITION) addFieldPositionToContentTypes();
            //if (CONFIG.FUNCTIONS.ENABLE_MORE_INFO_BLOCK) addMoreInfoBlock();
            //if (CONFIG.FUNCTIONS.ENABLE_FRONT_LINK) addFrontLink();
            //if (CONFIG.FUNCTIONS.ENABLE_USER_LINK) addLinkToCreators();
            //if (CONFIG.FUNCTIONS.ENABLE_CONTENTTYPE_RELATIONLINK) addContenttypeRelationLink();
            //if (CONFIG.FUNCTIONS.ENABLE_CHILDREN_CONTENTTYPE_IDENTIFIER) addChildrenContenttypeIdentifier();
            //if (CONFIG.FUNCTIONS.ENABLE_CONTENTVIEW_ATTRIBUTE_IDENTIFIER) addContentViewAttributeIdentifier();
        }
    });
})(window.jQuery.noConflict(true));
