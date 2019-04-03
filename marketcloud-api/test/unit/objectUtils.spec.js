var Utils = require('../../libs/util.js')

var expect = require('chai').expect


describe('Test object transformation functions', function () {

  it("Should calculate correctly the array intersection", function(){
   var a = [1,3,5,7,9,1];
   var b = [1,2,6,8,10,9,2,0,1,1];

    expect(Utils.intersect(a,b).toString()).to.equal("1,9");
  })



    it("Should correctly find existing and non.existing properties in nested object", function() {
    var o = {
      foo: {
        bar: {
          baz: 1
        },
        zoo: {
          bear: {
            male: true,
            female: false
          }
        }
      },
      mushroom: 7
    }

    var tests = [
      'foo',
      'foo.bar',
      'foo.bar.baz',
      'foo.zoo.bear.male',
      'foo.zoo.bear.female',
      'foo.bar.mushroom',
      'zoo.mushroom'
    ]

    var results = tests.map((tcase) => {
      return Utils.ensureObjectHasProperty(o, tcase);
    });
    var expectedResults = [
    true,
    true,
    true,
    true,
    true,
    false,
    false]

    expect(results.toString()).to.equal(expectedResults.toString())
  })

})