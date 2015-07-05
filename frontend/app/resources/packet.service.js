'use strict';

angular.module('probrApp')
    .factory('Packet', function ($resource) {
        var Packet = $resource('/api/packets/:packetId/', {packetId: '@_id'},
            {
                query: {method: 'GET', isArray: false }
            }
        );
        return Packet;
    });