var Ext = window.Ext4 || window.Ext;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    title: 'Test Status Panel',
    items: [
        {
            xtype: 'container',
            itemId: 'releaseFilter'
        },
        {
            xtype: 'container',
            itemId: 'dispGrid'                        
        }
    ],

    launch: function() {
        this.down('#releaseFilter').add({
            xtype: 'rallyreleasecombobox',
            itemId: 'releaseComboBox',
            listeners: {
                change: this._queryForStoriesandPIs,
                ready: this._queryForStoriesandPIs,
                scope: this
            }
        });
    },

    _queryForStoriesandPIs: function() {

        //if loading new iteration, destroy existing grids
        if (this._summaryGrid !== undefined) {
            this._summaryGrid.destroy();
            this._Grid.destroy();
            this._Grid2.destroy();
        }

       var StoriesStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'User Story',
            autoLoad: true,
            storeId: 'StoryStore',
            filters: [{
                property: 'Feature.Release.Name',
                operator: '=',
                value: this.down('#releaseComboBox').getRecord().data.Name
            }, {
                property: 'DirectChildrenCount',
                operator: '=',
                value: 0
            }],
            sorters: [ // group by feature for easier traversal through the array
                {
                    property: 'Feature',
                    direction: 'ASC'
                }
            ],
            fetch: [
                'FormattedID','Name','ObjectID','Feature','Iteration','ScheduleState','Owner','StartDate'
            ],
            listeners: {
                load: function(store, data, success) {
                    this._breakdownStoriesandFeatures(store, data);
                },
                scope: this
            }
        });

    },
    
    _organizeGridData: function(origArray ) {
        console.log("Organize Grid Data");
        var currentFeature = "";
        var currentIteration = "";
        var currentStories = "";
        var prevFeature = "";
        var prevIteration = "";
        var currentCount = 0; // used to know when we are at the end of the array
        var totalRecords = origArray.length;
        console.log("Array count: ", totalRecords);
        console.log(origArray);
        var line = [];
        var newArray = [];
        var firstTimeFeature = true;
        
        Ext.Array.each(origArray, function(record) {
            currentCount ++; 
            currentFeature = record.Feature;
            currentIteration = record.Iteration;
        
            line = {
                Feature: "",
                Iteration: "",
                Story : ""
            };
            
            // check for last record
            if( currentCount == totalRecords ){
                // check for change in Feature
                if ( currentFeature == prevFeature ) {
                    // check for change in Iteration
                    if( currentIteration == prevIteration ) {
                        line.Feature = "";
                        line.Iteration = prevIteration;
                        line.Story = currentStories += record.Story; // tack on last story in this iteration
                    } 
                    else { // same feature, new iteration, meaning new story
                        // close out the previous iteration
                         if( firstTimeFeature ) {
                            line.Feature = currentFeature;
                            firstTimeFeature = false;
                        }
                        else {
                            line.Feature = "";
                        }
                        line.Iteration = prevIteration += "<BR>" + currentIteration;
                        line.Story = currentStories += record.Story;
                    } // end same feature, new iteration
                    newArray.push(line);
                } 
                else { // sill last record, but feature changed
                    // close out prev record
                    line.Feature = "";
                    line.Iteration = prevIteration;
                    line.Story =  currentStories;
                    newArray.push(line);
                 
                    // now add the new feature, iteration, story
                    line.Feature = currentFeature;
                    line.Iteration = currentIteration;
                    line.Story = record.Story;
                    newArray.push(line);
                } //end last record, feature changed
            } 
            else { // not the last record
                if( currentFeature == prevFeature ){
                    if( currentIteration == prevIteration ) {
                        // Just build up the stories 
                        currentStories += record.Story + "<BR>";
                    }
                    else { //same feature, new iteration, story
                        if( firstTimeFeature ) {
                            line.Feature = currentFeature;
                            firstTimeFeature = false;
                        }
                        else {
                            line.Feature = "";
                        }

                        line.Iteration = prevIteration;
                        line.Story = currentStories;
                        if ( currentCount > 1 ) { // don't push if the first record
                            newArray.push(line);
                        }
                        currentStories = record.Story + "<BR>";
                        prevIteration = currentIteration;
                    }
                }
                else { // not last record, feature changed
                    // close out prev record
                     if( firstTimeFeature ) {
                        line.Feature = currentFeature;
                        firstTimeFeature = false;
                    }
                    else {
                        line.Feature = "";
                    }
                    
                    line.Iteration = prevIteration;
                    line.Story =  currentStories;
                    newArray.push(line);

                 
                    // reset feature, iteration, story
                    prevFeature = currentFeature;
                    prevIteration = currentIteration;
                    currentStories = record.Story;
                    firstTimeFeature = true;
                }
            } // end not last record
        });
        console.log(newArray);
        return newArray;
    },

    _breakdownStoriesandFeatures: function(mystore, storydata) {
        var that = this;
        that._FeatureList = [];
        var FeatureList = [];
        var IterationList = [];
        //console.log("_breakdownStoriesandFeatures");
        //console.log(storydata);

        Ext.Array.each(storydata, function(record) {

            var featureName = record.get('Feature').Name;
            var featureID = record.get('Feature').FormattedID;
            console.log("Feature id: ",featureID, "Feature name: ", featureName);
            
            FeatureList.push(featureID + ": " + featureName);

            var iterationName = record.get('Iteration') || "unassigned";
            var iterationDate;
            
            if (iterationName !== "unassigned") {
                iterationName = record.get('Iteration').Name;
                iterationDate = record.get('Iteration').StartDate;
                var month = iterationDate.substr(5,2);
                var day = iterationDate.substr(8,2);
                var year = iterationDate.substr(0,4);
                iterationDate = year + month + day;
            } else {
                iterationDate = 0;
            }
            
            IterationList.push(iterationName);

            var storyID = record.get('FormattedID');
            var storyName = record.get('Name');
            var storyOwner = record.get('Owner') || "unassigned";
            if (storyOwner !== "unassigned") {
                storyOwner = record.get('Owner')._refObjectName;
            }
            storyOwner = '<font color="purple">' + storyOwner + '</font>';
            var storyStatus = record.get('ScheduleState');
            
            if ((storyStatus == "Completed") || (storyStatus == "Accepted")) {
                storyStatus = '<font color="green">' + storyStatus + '</font>';
            } else {
                storyStatus = '<font color="red">' + storyStatus + '</font>';
            }
            that._FeatureList.push({
                Feature: featureID + ": " + featureName,
                Iteration: iterationName,
                Story: storyID + ": " + storyName + " (" + storyStatus + ", Owner: " + storyOwner + ")"
            });

        });

        //clean up lists to eliminate duplicates
        that._uniqIterationList = IterationList.reduce(function(a,b){
            if (a.indexOf(b) < 0 ) a.push(b);
            return a;
        },[]);
        that._uniqFeatureList = FeatureList.reduce(function(a,b){
            if (a.indexOf(b) < 0 ) a.push(b);
            return a;
        },[]);

        console.log(that._uniqIterationList);
        console.log(that._uniqFeatureList);
        console.log(that._FeatureList);
        
        var uniqIterationList = that._uniqIterationList;
        var uniqFeatureList = that._uniqFeatureList;
        FeatureList = that._FeatureList;

        //group stories by feature
        var storiesbyfeature = [];
        
        Ext.Array.each(uniqFeatureList, function(featurerecord, index1) {
            //Ext.Array.each(uniqIterationList, function(iterationrecord, index2) {
                Ext.Array.each(FeatureList, function(record, index3) {
                    if (featurerecord == record.Feature) {
                        if (storiesbyfeature[index1] === undefined) {
                            storiesbyfeature[index1] = record.Story;
                        } else {
                            storiesbyfeature[index1] = storiesbyfeature[index1] + ", " + record.Story;
                        }
                    }
                });
        });

        //group stories by iteration
        var storiesbyiteration = [];
        Ext.Array.each(uniqIterationList, function(iterationrecord, index1) {
            //Ext.Array.each(uniqIterationList, function(iterationrecord, index2) {
                Ext.Array.each(FeatureList, function(record, index3) {
                    if (iterationrecord == record.Iteration) {
                        if (storiesbyiteration[index1] === undefined) {
                            storiesbyiteration[index1] = record.Story;
                        } else {
                            storiesbyiteration[index1] = storiesbyiteration[index1] + ", " + record.Story;
                        }
                    }
                });
            //});
        });
        
        // do some grouping, first by Feature then by Iteration
        var gridArray = this._organizeGridData(that._FeatureList);
        console.log("data organized");
        console.log( gridArray );

        //output to screen
        this._Grid = Ext.create('Rally.ui.grid.Grid', {
            xtype: 'rallygrid',
            store: Ext.create('Rally.data.custom.Store', {
                storeId: 'FeatureStoryStore',
                //data: that._FeatureList,
                data: gridArray,
                autoScroll: true,
                columnLines: true
            }),
            
            title: 'Feature Stories by Iteration',
            enableEditing: true,
            columnCfgs: [
                //{
                //    text: 'Defect ID', dataIndex: 'FormattedID', flex: 1, 
                //   renderer: function (val, meta, record) {
                //        return '<a href="'+ record.data.Defectref + '"target="_parent">' + val + '</a>';
                //    }
                //},
                {
                    text: 'Feature', dataIndex: 'Feature', flex: 2
                },
                {
                    text: 'Iteration', dataIndex: 'Iteration', flex: 1
                },
                {
                    text: 'Story', dataIndex: 'Story', flex: 3
                }
            ]
        });
        this.down('#dispGrid').add(this._Grid);
      }
   });