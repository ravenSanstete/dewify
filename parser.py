# this file is devoted for parsing the bvh format into a json file, which can be used for three.js or gl's
# you can find the BVH format spec. in http://research.cs.wisc.edu/graphics/Courses/cs-838-1999/Jeff/BVH.html


# NOTE: Morino will not be so strict with the spec, which means an extra(or missed) line will not be blamed..


# IF you use this data for implementing skeletal animation, you will find the initial rotation in the first keyframe data


import sys
import pdb
import json



MORINO = [False, False, False, False, False];

## a keyword dictionary
KEYWORDS = {
   'HIER' : 'HIERARCHY',
    'MOT': 'MOTION',
    'RT': 'ROOT',
    'OST': 'OFFSET',
    'JNT' : 'JOINT',
    'CHN' : 'CHANNELS',
    'END' : 'End Site',
    'EMPTY' : '',
    'LB' : '{',
    'RB' : '}',
    'ANOY': 'FIN',
    'FRT' : 'Frame Time:',
    'FR' : 'Frames:'
};

STRIPPED_CHAR = '\t\r ';



def morino_assert(conditions):
    if(not conditions):
        sys.stderr.write("BAD BVH FORMAT\n");
        assert(False);
    return;



def tokenize(s):
    return s.strip(STRIPPED_CHAR).replace('\t', ' ').split();



# default order of channel input is [X, Y, Z, ZROT, YROT, XROT] (RIGHT HAND)

def create_node(offsets, id, pid = -1, name = None, channels = 0):
    return {
        'offsets': offsets,
        'id' : id,
        'parent_id' : pid,
        'name' : name if name != None else (KEYWORDS['ANOY']+'_'+str(id)),
        'chn_num' : channels
    };

"""
@param hier: lines of data in the hier part
"""
def parse_hierarchy(hier_lines):
    nodes = list();
    pid = -1;
    id = 0;
    s = 0 ;

    e = len(hier_lines) - 1;

    while(e >= 0):
        if(hier_lines[e].strip(STRIPPED_CHAR) != KEYWORDS['EMPTY']):
            break;
        e -= 1;

    # which collects the matching relation among L brace and R brace
    brace_mapping = dict();
    stk = list();

    cursor = s;
    while(cursor <= e):
        if(hier_lines[cursor].strip(STRIPPED_CHAR) == KEYWORDS['LB']):
            stk.append(cursor);
        if(hier_lines[cursor].strip(STRIPPED_CHAR) == KEYWORDS['RB']):
            morino_assert(len(stk) > 0);
            brace_mapping[stk.pop()] = cursor;
        cursor += 1;
    # to check the brace matching problem
    morino_assert(len(stk) == 0);
    if(MORINO[1]):
        print(brace_mapping);



    s = [s];
    id = [id];
    pid = [pid];
    _parse_hierarchy(hier_lines, s , e, id, pid, nodes, brace_mapping);

    if(MORINO[2]):
        for jnt in nodes:
            print(jnt);
    return nodes;


"""
@func: recursively parse the bvh skeletal format
"""
def _parse_hierarchy(hier_lines, s, e, id, pid, nodes, brace_mapping):
    tokens = None;
    # termination condition(End site), the end site has no other information than the offsets
    if(hier_lines[s[0]].strip(STRIPPED_CHAR) == KEYWORDS['END']):
        s[0] += 1;
        morino_assert(hier_lines[s[0]].strip(STRIPPED_CHAR) == KEYWORDS['LB'] and hier_lines[e].strip(STRIPPED_CHAR) == KEYWORDS['RB']);
        s[0] += 1;
        # parse the offsets
        tokens = tokenize(hier_lines[s[0]]);
        morino_assert(len(tokens) == 4 and tokens[0] == KEYWORDS['OST']);
        nodes.append(create_node([float(v) for v in tokens[1:]], id[0], pid[-1]));
        # increment the id
        id[0] += 1;
        s[0] += 1;
        pid.append(None);
        return;

    while(s[0] <= e):
        tokens = tokenize(hier_lines[s[0]]);
        morino_assert(len(tokens) == 2 and (tokens[0] == KEYWORDS['RT'] or tokens[0] == KEYWORDS['JNT']));
        node_name = tokens[1];
        # then check the brace
        s[0] += 1;
        morino_assert(hier_lines[s[0]].strip(STRIPPED_CHAR) == KEYWORDS['LB']);
        # then parse the offset and the channels
        s[0] += 1;
        tokens = tokenize(hier_lines[s[0]]);
        morino_assert(len(tokens) == 4 and tokens[0] == KEYWORDS['OST']);
        offsets = [float(v) for v in tokens[1:]];

        # parse the channel num
        s[0] += 1;
        tokens = tokenize(hier_lines[s[0]]);
        morino_assert(len(tokens) >= 2 and tokens[0] == KEYWORDS['CHN']);
        chn_num = int(tokens[1]);

        nodes.append(create_node(offsets, id[0], pid[-1], node_name, chn_num));

        pid.append(id[0]);
        id[0] += 1;
        s[0] += 1; # move to the next level
        _parse_hierarchy(hier_lines, s, e, id, pid, nodes, brace_mapping);
        # pdb.set_trace();
        while(s[0]<= e and hier_lines[s[0]].strip(STRIPPED_CHAR) == KEYWORDS['RB']):
            s[0] += 1;
            pid.pop();
    return;



"""
@parma: motions: lines of array of double values
"""
def parse_motions(motions, chn_count):
    # the motion part is a little bit easier
    s = 0;
    tokens = tokenize(motions[s]);
    morino_assert(len(tokens) == 2 and tokens[0] == KEYWORDS['FR']);
    frame_count = int(tokens[1]);
    s += 1;
    tokens = tokenize(motions[s]);
    morino_assert(motions[s].strip(STRIPPED_CHAR).startswith(KEYWORDS['FRT']) and len(tokens)==3);

    frame_time = float(tokens[2]);

    s += 1;
    frames = list();
    for i in range(frame_count):
        chn_ins = tokenize(motions[s+i]);
        morino_assert(len(chn_ins) == chn_count); # to assert the data is not corrupted
        frames.append([float(c) for c in chn_ins]);

    return {
        'frame_count' : frame_count,
        'frame_time' : frame_time,
        'frames' : frames
    };


def split_components(bvh_lines):
    hier_head_i = -1;
    mot_head_i = -1;


    for iter, line in enumerate(bvh_lines):
        line = line.strip();
        if(line == KEYWORDS['HIER']):
            hier_head_i = iter;
        if(line == KEYWORDS['MOT']):
            mot_head_i = iter;
            break; # no need to go through the frame part

    # bad format
    morino_assert(hier_head_i >= 0 and mot_head_i >= 0);

    return bvh_lines[hier_head_i+1:mot_head_i], bvh_lines[mot_head_i+1:];


"""
BEGIN OF AUX FUNCTIONS
"""
# read the data into memory, a trivial io wrapper
def load(path):
    fid= open(path, 'r');
    obj = fid.read();
    fid.close();
    return obj;

def dump(data, path):
    fid = open(path, 'w+');
    fid.write(data);
    fid.close();
    return;


def construct_json(joints):
    nodes = list();
    links = list();

    for jnt in joints:
        nodes.append({
            'name': jnt['name'] ,
            'group': 1
        });
        links.append({
            'target': jnt['parent_id'] if jnt['parent_id'] >=0 else 0,
            'source': jnt['id'],
            'weight': 1
        })

    return json.dumps({
        'nodes':nodes,
        'links':links
    });
"""
END OF AUX FUNCTIONS
"""






"""
@param path: the path to the BVH file
@param dump_path(*): path to dump (OPTIONAL)

@return a json-format anim data
"""

def bvh_convert(path, dump_path = None):
    bvh_dat = load(path);
    bvh_dat = bvh_dat.split('\n');
    hier, motions = split_components(bvh_dat);


    if(MORINO[0]):
        print('################ BEGIN OF HIER ########################');
        print(hier);
        print('################ END OF HIER ########################\n\n\n');

        print('################ BEGIN OF MOTION ########################');
        print(motions[0:2]);
        print('################ END OF MOTION ########################\n\n\n');

    jnts = parse_hierarchy(hier);
    if(MORINO[3]):
        dump(construct_json(jnts), 'sample.json');

    # first count the channel sum
    chn_count = 0;
    for jnt in jnts:
        chn_count += jnt['chn_num'];

    frame_info = parse_motions(motions, chn_count);

    if(MORINO[4]):
        print("channel input port count: {}".format(chn_count));
        print(frame_info);

    json_str = json.dumps({
        'hierarchy' : jnts,
        'motion' : frame_info
    });

    if(dump_path != None):
        dump(json_str, dump_path);
    return json_str;







if __name__ == '__main__':
    test_path = 'data/{}/{}_{}.bvh';
    count = [6, 1, 4, 42, 37];
    for j in range(10, 15):
        for i in range(1, count[j-10]+1):
            print('parsing {}:{}'.format(j, i));
            bvh_convert(test_path.format(j,j,str(i).rjust(2, '0')));
    bvh_convert('data/Example1.bvh', 'Example1.json');
