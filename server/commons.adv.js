require.config({
    waitSeconds: 0,
    paths: {
        'geotoolkit': './libs/geotoolkit/geotoolkit.adv',
        'geotoolkit.controls': './libs/geotoolkit/geotoolkit.controls.adv',
        'geotoolkit.pdf': './libs/geotoolkit/geotoolkit.pdf.adv',
        'geotoolkit.widgets': './libs/geotoolkit/geotoolkit.widgets.adv',
        'geotoolkit.report': './libs/geotoolkit/geotoolkit.report.adv',
        'geotoolkit.svg': './libs/geotoolkit/geotoolkit.svg.adv',
        'geotoolkit.data': './libs/geotoolkit/geotoolkit.data.adv',
        'geotoolkit.welllog': './libs/geotoolkit/geotoolkit.welllog.adv',
        'geotoolkit.welllog.las': './libs/geotoolkit/geotoolkit.welllog.las.adv',
        'geotoolkit.welllog.widgets': './libs/geotoolkit/geotoolkit.welllog.widgets.adv',
    },
    shim: {
        'geotoolkit.widgets': {
            deps: ['geotoolkit'],
        },
        'geotoolkit.svg': {
            deps: ['geotoolkit'],
        },
        'geotoolkit.controls': {
            deps: ['geotoolkit'],
        },
    },
});
