'use strict';
const notificationReadStatus = new Map();
const notificationTimeoutMap = new Map();
const notificationSocket = new ReconnectingWebSocket(
    `ws://${window.location.host}/ws/notifications/`
);
const notification_sound = new Audio('/static/openwisp_notifications/audio/notification_bell.mp3');
const observer = new IntersectionObserver(notificationIntersectionObserver, {
    threshold: 1,
    root: document.querySelector('.notification-wrapper')
});

(function ($) {
    $(document).ready(function () {
        notificationWidget($);
        initNotificationDropDown($);
        initWebSockets($);
    });
})(django.jQuery);

function initNotificationDropDown($) {
    $('.ow-notifications').click(function (e) {
        e.stopPropagation();
        $('.notification-dropdown').toggleClass('hide');
    });

    $(document).click(function (e) {
        e.stopPropagation();
        // Check if the clicked area is dropDown or not
        if ($('.notification-dropdown').has(e.target).length === 0) {
            $('.notification-dropdown').addClass('hide');
        }
    });
}

function notificationWidget($) {

    let nextPageUrl = '/api/v1/notifications/',
        renderedPages = 2,
        busy = false,
        fetchedPages = [],
        lastRenderedPage = 0;
    // 1 based indexing (0 -> no page rendered)

    function pageContainer(page) {
        var div = $('<div class="page"></div>');
        page.forEach(function (notification) {
            let elem = $(notificationListItem(notification));
            div.append(elem);
            if (notification.unread) {
                observer.observe(elem[0]);
            }
        });
        return div;
    }

    function appendPage() {
        $('.notification-wrapper').append(pageContainer(fetchedPages[lastRenderedPage]));
        if (lastRenderedPage >= renderedPages) {
            $('.notification-wrapper div:first').remove();
        }
        lastRenderedPage += 1;
        busy = false;
    }

    function fetchNextPage() {
        $.ajax({
            type: 'GET',
            url: nextPageUrl,
            success: function (res) {
                nextPageUrl = res.next;
                if (res.count === 0) {
                    // If response does not have any notification, show no-notifications message.
                    $('.no-notifications').removeClass('hide');
                    $('#mark-all-read').addClass('disabled');
                    if ($('#show-unread').html() !== 'Show all') {
                        $('#show-unread').addClass('disabled');
                    }
                    busy = false;
                } else {
                    fetchedPages.push(res.results);
                    appendPage();
                    // Remove 'no new notification' message.
                    $('.no-notifications').addClass('hide');
                    $('.btn').removeClass('disabled');
                }
            },
            error: function (error) {
                busy = false;
                throw error;
            },
        });
    }

    function pageDown() {
        busy = true;
        if (fetchedPages.length > lastRenderedPage) {
            appendPage();
        } else if (nextPageUrl !== null) {
            fetchNextPage();
        } else {
            busy = false;
        }
    }

    function pageUp() {
        busy = true;
        if (lastRenderedPage > renderedPages) {
            $('.notification-wrapper div.page:last').remove();
            var addedDiv = pageContainer(fetchedPages[lastRenderedPage - renderedPages - 1]);
            $('.notification-wrapper').prepend(addedDiv);
            lastRenderedPage -= 1;
        }
        busy = false;
    }

    function onUpdate() {
        if (!busy) {
            var scrollTop = $('.notification-wrapper').scrollTop(),
                scrollBottom = scrollTop + $('.notification-wrapper').innerHeight(),
                height = $('.notification-wrapper')[0].scrollHeight;
            if (height * 0.90 <= scrollBottom) {
                pageDown();
            } else if (height * 0.10 >= scrollTop) {
                pageUp();
            }
        }
    }

    function notificationListItem(elem) {
        let timestamp;
        if (!notificationReadStatus.has(elem.id)) {
            if (elem.unread) {
                notificationReadStatus.set(elem.id, 'unread');
            } else {
                notificationReadStatus.set(elem.id, 'read');
            }
        }
        let klass = notificationReadStatus.get(elem.id);
        let elem_timestamp = new Date(elem.timestamp);
        if (elem_timestamp.toDateString() !== new Date().toDateString()) {
            timestamp = `${elem_timestamp.toLocaleDateString()} at ${elem_timestamp.toLocaleTimeString()}`;
        } else {
            timestamp = elem_timestamp.toLocaleTimeString();
        }

        return `<div class="notification-elem ${klass}" id=${elem.id}
                        data-location="${elem.target_object_url}">
                    <div class="notification-meta">
                        <div class="${elem.level} icon"></div>
                        <div>${timestamp}</div>
                    </div>
                    ${elem.message}
                </div>`;
    }

    function initNotificationWidget($) {
        $('.notification-wrapper').on('scroll', onUpdate);
        onUpdate();
    }

    function refreshNotificationWidget(e = null, url = '/api/v1/notifications/') {
        $('.notification-wrapper').empty();
        fetchedPages.length = 0;
        lastRenderedPage = 0;
        nextPageUrl = url;
        notificationReadStatus.clear();
        $('.notification-wrapper').scroll();
    }

    initNotificationWidget($);

    // Handler for filtering unread notifications
    $('#show-unread').click(function () {
        if ($(this).html() === 'Show unread only') {
            refreshNotificationWidget(null, '/api/v1/notifications/?unread=true');
            $(this).html('Show all');
        } else {
            refreshNotificationWidget(null, '/api/v1/notifications/');
            $(this).html('Show unread only');
        }
    });

    // Handler for marking all notifications read
    $('#mark-all-read').click(function () {
        $.ajax({
            type: 'POST',
            url: `/api/v1/notifications/read/`,
            headers: {
                'X-CSRFToken': $('input[name="csrfmiddlewaretoken"]').val()
            },
            success: function () {
                refreshNotificationWidget();
                $('#show-unread').html('Show unread only');
            },
            error: function (error) {
                throw error;
            },
        });
    });

    // Handler for marking single notification as read
    $('.notification-wrapper').on('click', '.notification-elem', function () {
        let elem = $(this);
        // If notification is unread then send read request
        if (elem.hasClass('unread')) {
            markNotificationRead($, elem[0]);
        }
        window.location = elem.data('location');
    });

    $('.notification-wrapper').bind('refreshNotificationWidget', refreshNotificationWidget);
}

function markNotificationRead(elem) {
    notificationSocket.send(
        JSON.stringify({
            'notification_id': elem.id
        })
    );
    try {
        elem.classList.remove('unread');
    } catch (e) {}
    notificationReadStatus.set(elem.id, 'read');
    observer.unobserve(elem);
}

function initWebSockets($) {
    notificationSocket.onmessage = function (e) {
        let data = JSON.parse(e.data);
        // Update notification count
        let countTag = $('#notification-count');
        if (data.notification_count === 0) {
            countTag.remove();
        } else {
            // If unread tag is not present than insert it.
            // Otherwise, update innerHTML.
            if (countTag.length === 0) {
                let html = `<span id="notification-count">${data.notification_count}</span>`;
                $('.ow-notifications').append(html);
            } else {
                countTag.html(data.notification_count);
            }
        }
        // Check whether to update notification widget
        if (data.reload_widget) {
            $('.notification-wrapper').trigger('refreshNotificationWidget');
        }
        // Check whether to display notification toast
        if (data.notification) {
            $('.toast').html(data.notification.message);
            $('.toast').data('location', data.notification.target_object_url);
            $('.toast').data('uuid', data.notification.id);
            notification_sound.play();
            $('.toast').slideDown('slow', function () {
                setTimeout(function () {
                    $('.toast').slideUp('slow', function () {
                        $('.toast').data('location', null);
                        $('.toast').empty();
                    });
                }, 4000);
            });
        }
    };
    // Make toast message clickable
    $('.toast').click(function (e) {
        markNotificationRead(e.target);
        window.location = $(this).data('location');
    });
}

function notificationIntersectionObserver(entries) {
    entries.forEach(function (entry) {
        let elem = entry.target;
        if (elem.classList.contains('unread')) {
            if (entry.isIntersecting === true) {
                let timeoutId = setTimeout(function () {
                    markNotificationRead(elem);
                }, 1000);
                notificationTimeoutMap.set(elem.id, timeoutId);
            } else {
                clearTimeout(notificationTimeoutMap.get(elem.id));
                notificationTimeoutMap.delete(elem.id);
            }
        }
    });
}
