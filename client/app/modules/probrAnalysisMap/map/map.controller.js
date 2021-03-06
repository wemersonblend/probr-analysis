'use strict'

angular.module('probrAnalysisMap')
    .controller('MapCtrl', function ($scope, $state, $stateParams, $rootScope, $location, Location, Room, leafletData) {

        $scope.geojson = {
            data: {type: "FeatureCollection", features: []}, style: {
                fillColor: "#55a67f",
                fillOpacity: 0.7,
                weight: 2,
                color: '#55a67f',
                opacity: 1
            }
        };

        // Room
        Room.query({}, function (rooms) {

            if (rooms !== undefined) {

                angular.forEach(rooms, function (room) {
                    $scope.geojson.data.features.push(room.bounds.features[0]);
                    leafletData.getMap().then(function (map) {
                        var latlngs = [];
                        for (var i in room.bounds.features[0].geometry.coordinates) {
                            var coord = room.bounds.features[0].geometry.coordinates[i];
                            for (var j in coord) {
                                var points = coord[j];
                                latlngs.push(angular.copy(points).reverse()); // copy it, or else it changes the reference points in the geojson
                            }
                        }
                        map.fitBounds(latlngs);
                    });
                });

            }

        });

        $scope.overlays = {};

        $scope.query = function (startTimestamp, endTimestamp) {

            $scope.isLoading = true;
            var areaCutoff = 100;
            var noOfCircles = 3;

            var query = {
                area: {$lte: areaCutoff},
                noOfCircles: {$gte: noOfCircles},
                time: {$gt: startTimestamp, $lt: endTimestamp}
            };

            if ($stateParams.mac_address) {
                query.mac_address = $stateParams.mac_address;
            } else {
                // ignore routers that pollute our data :(
                query.mac_address = {$nin: ['0002e342cce0']};
            }

            Location.query({
                query: query
            }, function (resultObj) {

                var nrOfLocations = resultObj.length;
                var data = [];

                angular.forEach(resultObj, function (obj) {

                    var weightedSignal = 0;

                    angular.forEach(obj.derivedFrom, function (obj) {
                        weightedSignal += obj.weightedSignal;
                    });

                    var correctionFactor = 100;
                    var logFactor = 75;

                    if (nrOfLocations < 50) {
                        correctionFactor = 5;
                    }

                    var avgWeightedSignal = weightedSignal / obj.derivedFrom.length;
                    var heatmapPower = (1 / Math.log(logFactor)) * Math.log(avgWeightedSignal + logFactor) / (nrOfLocations / correctionFactor);

                    data.push([obj.location.coordinates[1], obj.location.coordinates[0], heatmapPower]);
                });

                var overlays = {
                    heatmap: {
                        name: "Heat Map",
                        type: "webGLHeatmap",
                        data: data,
                        visible: true,
                        layerOptions: {size: 1.2},
                        doRefresh: true
                    }
                }

                angular.extend($scope.overlays, overlays);
                $scope.isLoading = false;

            });

            $location.search({startTimestamp: startTimestamp, endTimestamp: endTimestamp, tags: tags, mac_address: $stateParams.mac_address});

        };

        var startTimestamp = parseInt($stateParams.startTimestamp);
        var endTimestamp = parseInt($stateParams.endTimestamp);
        var tags = $stateParams.tags !== undefined ? $stateParams.tags : [];

        $scope.query(startTimestamp, endTimestamp);

        angular.element(document).ready(function () {
            $rootScope.$emit("updatePositions");

            angular.element(window).resize(function () {
                $rootScope.$emit("updatePositions");
            });
        });

        $scope.nextSlot = function () {
            var newStart = startTimestamp + (endTimestamp - startTimestamp);
            var newEnd = endTimestamp + (endTimestamp - startTimestamp);
            $scope.query(newStart, newEnd);
        }

        $scope.previousSlot = function () {
            var newStart = startTimestamp - (endTimestamp - startTimestamp);
            var newEnd = endTimestamp - (endTimestamp - startTimestamp);
            $scope.query(newStart, newEnd);
        }

    });
