const assert = require('assert');
const { Logger } = require('werelogs');
const log = new Logger('S3').newRequestLogger();
const storedParts = require('./storedParts.json');
const { validateAndFilterMpuParts } =
    require('../../../../lib/api/apiUtils/object/processMpuParts');
const jsonList = require('./jsonList');
describe.only('TEST::validateAndFilterMpuParts', () => {

    it('should filter extra parts', () => {
        const mpuOverviewKey = '"overview..|..fred..|..8e51eecb51ca4caa96dc4ebd51514f2a"';
        const splitter = '..|..';
        const result = validateAndFilterMpuParts(storedParts, jsonList,
            mpuOverviewKey, splitter, log);
        console.log(result)
        assert(result);
    });

});
