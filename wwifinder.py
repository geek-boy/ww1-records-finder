import urllib
import re

from flask import Flask
from flask import render_template
from flask import request, jsonify

from rstools.client import RSSearchClient, RSItemClient
from cwgctools.client import CWGCClient
from awmtools.client import AWMBioSearchClient, RollClient, EmbarkationClient, RedCrossClient, HonoursClient


CONTEXT = 'local'
#CONTEXT = 'production'


app = Flask(__name__)


class WebFactionMiddleware(object):
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        environ['SCRIPT_NAME'] = '/ww1-records'
        return self.app(environ, start_response)

if CONTEXT == 'production':
    app.wsgi_app = WebFactionMiddleware(app.wsgi_app)


@app.route('/')
def show_index():
    return render_template('index.html')


@app.route('/naa/search/')
def search_naa():
    rs = RSSearchClient()
    kwargs = request.args.to_dict()
    kwargs['page'] = request.args.get('page', 1)
    kwargs['sort'] = 3
    print kwargs
    results = rs.search_names(**kwargs)
    return jsonify(results)


@app.route('/naa/items/<barcode>/')
def get_naa_item(barcode):
    rs = RSItemClient()
    result = rs.get_summary(barcode, date_format='iso')
    return jsonify({'result': result})


@app.route('/cwgc/search/')
def search_cwgc():
    wgc = CWGCClient()
    kwargs = request.args.to_dict()
    kwargs['australian'] = ['on']
    kwargs['war'] = ['First World War']
    kwargs['forename_initials'] = ['rdoForename']
    results = wgc.search(**kwargs)
    return jsonify(results)


@app.route('/cwgc/items/<path:url>/')
def get_cwgc_item(url):
    url = url.replace(' ', '%20')
    url = url.replace('http:/w', 'http://w')
    cwgc = CWGCClient()
    result = cwgc.get_details(url)
    return jsonify({'result': result})


@app.route('/awm/<path:db>/search/')
def search_awm_dbs(db):
    awm = AWMBioSearchClient()
    kwargs = request.args.to_dict()
    kwargs['db'] = db
    if db == 'honours_and_awards':
        kwargs['roll_type'] = 'All'
    kwargs['conflict'] = 'First World War, 1914-1918'
    results = awm.search(**kwargs)
    return jsonify(results)


@app.route('/awm/items/<path:roll>/<path:url>')
def get_awm_item(roll, url):
    url = re.sub(r'person\.asp\/', 'person.asp?p=', url)
    url = url.replace('http:/w', 'http://w')
    if 'roll_of_honour' in roll:
        awm = RollClient()
    elif 'embarkation' in roll:
        awm = EmbarkationClient()
    elif 'wounded_and_missing' in roll:
        awm = RedCrossClient()
    elif 'honours_and_awards' in roll:
        awm = HonoursClient()
    result = awm.get_details(url=url)
    return jsonify({'result': result})


if __name__ == '__main__':
    app.run(debug=True)
