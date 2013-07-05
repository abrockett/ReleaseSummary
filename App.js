Ext.define('Rally.apps.releasesummary.App', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    scopeType: 'release',

    addContent: function () {
        this.callParent(arguments);

        Rally.data.ModelFactory.getModels({
            types: ['UserStory', 'Defect'],
            success: function(models) {
                this.models = models;
                this._addContent();
            },
            scope: this
        });
    },

    _addContent: function() {
        this.add(
            {
                xtype: 'component',
                itemId: 'releaseInfo',
                componentCls: 'releaseInfo',
                tpl: [
                    '<p><b>About this release: </b><br />',
                    '<p class="release-notes">{notes}</p>',
                    'Additional information is available <a href="{detailUrl}" target="_top">here.</a></p>'
                ]
            }, 
            {
                xtype: 'container',
                itemId: 'stories',
                items: [{
                    xtype: 'displayfield',
                    itemId: 'story-title',
                    componentCls: 'gridTitle',
                    value: 'Stories:'
                }]
            }, 
            {
                xtype: 'container',
                itemId: 'defects',
                items: [{
                    xtype: 'displayfield',
                    itemId: 'defect-title',
                    value: 'Defects:',
                    componentCls: 'gridTitle'
                }]
            }
        );

        this._buildGrids();
        this._loadReleaseDetails();
    },

    onScopeChange: function() {
        this.callParent(arguments);

        this._refreshGrids();
        this._loadReleaseDetails();
    },

    _loadReleaseDetails: function() {
        var release = this.getContext().getTimeboxScope().getRecord();
        var releaseModel = release.self;

        releaseModel.load(Rally.util.Ref.getOidFromRef(release), {
            fetch: ['Notes'],
            success: function(record) {
                this.down('#releaseInfo').update({
                    detailUrl: Rally.nav.Manager.getDetailUrl(release),
                    notes: record.get('Notes')
                });
            },
            scope: this    
        });
    },

    _buildGrids: function() {
        var storyStoreConfig = this._getStoreConfig({
            model: this.models.UserStory,
            listeners: {
                load: this._onStoriesDataLoaded,
                scope: this
            }
        });
        this.down('#stories').add(this._getGridConfig({
            itemId: 'story-grid',
            model: this.models.UserStory,
            storeConfig: storyStoreConfig
        }));

        var defectStoreConfig = this._getStoreConfig({
             model: this.models.Defect,
             listeners: {
                load: this._onDefectsDataLoaded,
                scope: this
            }
        });
        this.down('#defects').add(this._getGridConfig({
            itemId: 'defect-grid',
            model: this.models.Defect,
            storeConfig: defectStoreConfig
        }));
    },

    _getStoreConfig: function(storeConfig) {
        return Ext.apply({
            autoLoad: true,
            fetch: ['FormattedID', 'Name', 'ScheduleState'],
            filters: this._getFilters(),
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }],
            pageSize: 25
        }, storeConfig);
    },

    _getFilters: function() {
        return [
            {
                property: 'ScheduleState',
                operator: '>=',
                value: 'Accepted'
            },
            this.getContext().getTimeboxScope().getQueryFilter()
        ];
    },

    _getGridConfig: function(config) {
        return Ext.apply({
            xtype: 'rallygrid',
            componentCls: 'grid',
            columnCfgs: [
                {text: 'ID', dataIndex: 'FormattedID', xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')}, 
                {text: 'Name', dataIndex: 'Name', flex: 3}, 
                {text: 'Schedule State', dataIndex: 'ScheduleState', flex: 1}
            ]
        }, config);
    },

    _refreshGrids: function() {
        var filters = this._getFilters();
        this.down('#defect-grid').filter(filters, true, true);
        this.down('#story-grid').filter(filters, true, true);
    },

    _onStoriesDataLoaded: function (store) {
        this.down('#story-title').update('Stories: ' + store.getTotalCount());
    },

    _onDefectsDataLoaded: function (store) {
        this.down('#defect-title').update('Defects: ' + store.getTotalCount());
    },

    getOptions: function() {
        return [
            {
                text: 'Print',
                handler: this._onButtonPressed,
                scope: this
            }
        ];
    },

    _onButtonPressed: function() {
        var release = this.getContext().getTimeboxScope().getRecord().get('Name');
        var title = release, options;

        var css = document.getElementsByTagName('style')[0].innerHTML;
        
        options = "toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500";
        var printWindow = window.open('', '', options);

        var doc = printWindow.document;

        var stories = this.down('#stories');
        var defects = this.down('#defects');
        var releaseinfo = this.down('#releaseInfo');

        doc.write('<html><head>' + '<style>' + css + '</style><title>' + title + '</title>');

        doc.write('</head><body class="landscape">');
        doc.write('<p>Release: ' + release + '</p><br />');
        doc.write(stories.getEl().dom.innerHTML + defects.getEl().dom.innerHTML + releaseinfo.getEl().dom.innerHTML);
        doc.write('</body></html>');
        doc.close();

        this._injectCSS(printWindow);

        printWindow.print();

    },

    // source code to get the Rally CSS
    _injectContent: function(html, elementType, attributes, container, printWindow){
        elementType = elementType || 'div';
        container = container || printWindow.document.getElementsByTagName('body')[0];

        var element = printWindow.document.createElement(elementType);

        Ext.Object.each(attributes, function(key, value){
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        if(html){
            element.innerHTML = html;
        }

        return container.appendChild(element);
    },

    _injectCSS: function(printWindow){
        Ext.each(Ext.query('link'), function(stylesheet){
                this._injectContent('', 'link', {
                rel: 'stylesheet',
                href: stylesheet.href,
                type: 'text/css'
            }, printWindow.document.getElementsByTagName('head')[0], printWindow);
        }, this);
    }
});
